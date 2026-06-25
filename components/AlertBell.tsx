import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { createPortal } from 'react-dom'
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
  const bellRef = useRef<View>(null)
  const [panelPos, setPanelPos] = useState({ top: 72, right: 24 })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (currentUserId) loadAlerts(currentUserId, selectedMonth, selectedYear)
  }, [currentUserId, selectedMonth, selectedYear])

  function openPanel() {
    // Measure bell position to anchor panel below it
    if (bellRef.current) {
      ;(bellRef.current as any).measure((_x: number, _y: number, w: number, h: number, px: number, py: number) => {
        const right = window.innerWidth - px - w
        setPanelPos({ top: py + h + 8, right: Math.max(right, 8) })
      })
    }
    setShowAlerts(v => !v)
  }

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

  const panel = showAlerts ? createPortal(
    <>
      {/* Invisible overlay to close on outside click */}
      <div
        onClick={() => setShowAlerts(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
      />
      <div style={{
        position: 'fixed',
        top: panelPos.top,
        right: panelPos.right,
        width: 340,
        maxHeight: 480,
        backgroundColor: Colors.white,
        borderRadius: 12,
        zIndex: 9001,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: `1px solid ${Colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottom: `1px solid ${Colors.border}` }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: Colors.text }}>🔔 Alertas</div>
            <div style={{ fontSize: 12, color: Colors.textLight, marginTop: 2 }}>{MONTHS_FULL[selectedMonth]} {selectedYear}</div>
          </div>
          <button onClick={() => setShowAlerts(false)} style={{ background: 'none', border: 'none', fontSize: 16, color: Colors.textLight, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {alerts.length === 0 ? (
            <div style={{ color: Colors.textLight, fontSize: 14, padding: 16, textAlign: 'center' }}>
              Sin alertas en {MONTHS_FULL[selectedMonth]}
            </div>
          ) : (
            alerts.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 10, padding: 12, borderBottom: '1px solid #F0F0F0', alignItems: 'center', opacity: a.gestioned ? 0.5 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: Colors.text, marginBottom: 2, textDecoration: a.gestioned ? 'line-through' : 'none' }}>
                    Llamar a cliente por compra realizada
                  </div>
                  <div style={{ fontSize: 13, color: Colors.text, fontWeight: 500, textDecoration: a.gestioned ? 'line-through' : 'none' }}>{a.customer_name}</div>
                  <div style={{ fontSize: 12, color: Colors.textLight }}>{a.model}</div>
                  <div style={{ fontSize: 11, color: Colors.danger, marginTop: 2 }}>
                    Entregado: {formatDateCL(a.delivery_date)} · {a.daysElapsed} días hábiles
                  </div>
                </div>
                <button
                  onClick={() => a.gestioned ? handleUndoGestion(a.id) : handleGestion(a.id)}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    border: `2px solid ${a.gestioned ? Colors.success : Colors.border}`,
                    backgroundColor: a.gestioned ? Colors.success : 'transparent',
                    cursor: 'pointer', fontSize: 16,
                    color: a.gestioned ? Colors.white : Colors.textLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {a.gestioned ? '✓' : '○'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  ) : null

  return (
    <View ref={bellRef}>
      <TouchableOpacity style={styles.bellBtn} onPress={openPanel}>
        <Text style={styles.bellIcon}>🔔</Text>
        {pendingCount > 0 && (
          <View style={styles.badgeView}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      {panel}
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
})
