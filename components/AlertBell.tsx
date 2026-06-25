import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { Colors } from '../constants/colors'
import { usePeriod } from '../contexts/PeriodContext'

const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type AlertItem = {
  id: string
  customer_name: string
  model: string
  delivery_date: string
  daysElapsed: number
  gestioned: boolean
}

function countBusinessDays(from: Date, to: Date): number {
  let count = 0
  const cur = new Date(from)
  cur.setDate(cur.getDate() + 1)
  while (cur <= to) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function formatDateCL(dateStr: string): string {
  const [y, m, d] = dateStr.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export default function AlertBell() {
  const { selectedYear, selectedMonth } = usePeriod()
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (currentUserId) loadAlerts(currentUserId, selectedMonth, selectedYear)
  }, [currentUserId, selectedMonth, selectedYear])

  async function loadAlerts(userId: string, month: number, year: number) {
    const start = new Date(year, month, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const [{ data: sales }, { data: gestioned }] = await Promise.all([
      supabase.from('sales')
        .select('id, customer_name, model, delivery_date')
        .eq('user_id', userId)
        .eq('status', 'Entregado')
        .not('delivery_date', 'is', null)
        .gte('delivery_date', start)
        .lte('delivery_date', end),
      supabase.from('alert_actions')
        .select('sale_id')
        .eq('user_id', userId),
    ])

    if (!sales) return
    const gestionedIds = new Set((gestioned ?? []).map((g: any) => g.sale_id))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const items: AlertItem[] = []

    for (const sale of sales) {
      const deliveryDate = new Date(sale.delivery_date)
      deliveryDate.setHours(0, 0, 0, 0)
      const bizDays = countBusinessDays(deliveryDate, today)
      if (bizDays >= 3) {
        items.push({ ...sale, daysElapsed: bizDays, gestioned: gestionedIds.has(sale.id) })
      }
    }
    setAlerts(items)
  }

  async function handleGestion(saleId: string) {
    if (!currentUserId) return
    await supabase.from('alert_actions').insert({ user_id: currentUserId, sale_id: saleId })
    setAlerts(prev => prev.map(a => a.id === saleId ? { ...a, gestioned: true } : a))
  }

  async function handleUndoGestion(saleId: string) {
    if (!currentUserId) return
    await supabase.from('alert_actions').delete().eq('user_id', currentUserId).eq('sale_id', saleId)
    setAlerts(prev => prev.map(a => a.id === saleId ? { ...a, gestioned: false } : a))
  }

  const pendingCount = alerts.filter(a => !a.gestioned).length

  return (
    <View>
      <TouchableOpacity style={styles.bellBtn} onPress={() => setShowAlerts(v => !v)}>
        <Text style={styles.bellIcon}>🔔</Text>
        {pendingCount > 0 && (
          <View style={styles.badgeView}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {showAlerts && (
        <>
          {/* @ts-ignore */}
          <TouchableOpacity style={styles.overlay} onPress={() => setShowAlerts(false)} activeOpacity={1} />
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>🔔 Alertas</Text>
                <Text style={styles.panelSub}>{MONTHS_FULL[selectedMonth]} {selectedYear}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAlerts(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {alerts.length === 0 ? (
                <Text style={styles.emptyText}>Sin alertas en {MONTHS_FULL[selectedMonth]}</Text>
              ) : (
                alerts.map(a => (
                  <View key={a.id} style={[styles.item, a.gestioned && styles.itemDone]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, a.gestioned && styles.textDone]}>
                        Llamar a cliente por compra realizada
                      </Text>
                      <Text style={[styles.itemName, a.gestioned && styles.textDone]}>{a.customer_name}</Text>
                      <Text style={styles.itemSub}>{a.model}</Text>
                      <Text style={styles.itemDate}>
                        Entregado: {formatDateCL(a.delivery_date)} · {a.daysElapsed} días hábiles
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.checkBtn, a.gestioned && styles.checkBtnDone]}
                      onPress={() => a.gestioned ? handleUndoGestion(a.id) : handleGestion(a.id)}
                    >
                      <Text style={[styles.checkIcon, a.gestioned && styles.checkIconDone]}>
                        {a.gestioned ? '✓' : '○'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  bellIcon: { fontSize: 20 },
  badgeView: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: Colors.danger, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 },
  panel: {
    position: 'absolute' as any, top: 48, right: 0, width: 340,
    backgroundColor: Colors.white, borderRadius: 12, zIndex: 201,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    borderWidth: 1, borderColor: Colors.border, maxHeight: 480,
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  panelTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
  panelSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  closeBtn: { fontSize: 16, color: Colors.textLight, padding: 4 },
  list: { padding: 8, maxHeight: 380 },
  emptyText: { color: Colors.textLight, fontSize: 14, padding: 16, textAlign: 'center' },
  item: { flexDirection: 'row', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  itemDone: { opacity: 0.5 },
  itemTitle: { fontSize: 12, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  itemName: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  itemSub: { fontSize: 12, color: Colors.textLight },
  itemDate: { fontSize: 11, color: Colors.danger, marginTop: 2 },
  textDone: { textDecorationLine: 'line-through', color: Colors.textLight },
  checkBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkIcon: { fontSize: 16, color: Colors.textLight },
  checkIconDone: { color: Colors.white, fontWeight: 'bold' },
})
