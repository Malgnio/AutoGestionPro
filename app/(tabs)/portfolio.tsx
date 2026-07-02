import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import { usePeriod } from '../../contexts/PeriodContext'
import AlertBell from '../../components/AlertBell'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type PortfolioRow = {
  id: string
  customer_name: string
  rut: string
  model: string
  sale_month: string
  hasCredit: boolean
  hasVpp: boolean
  hasMpp: boolean
}

export default function PortfolioScreen() {
  const { selectedYear } = usePeriod()
  const [rows, setRows] = useState<PortfolioRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [selectedYear])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = `${selectedYear}-01-01`
    const end = `${selectedYear}-12-31`

    const [{ data: sales }, { data: credits }, { data: vpp }, { data: mpp }] = await Promise.all([
      supabase.from('sales').select('id, customer_name, rut, model, sale_month')
        .eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end)
        .order('sale_month', { ascending: true }),
      supabase.from('credits').select('rut').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('vpp').select('rut').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('mpp').select('rut').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
    ])

    const creditRuts = new Set(credits?.map(c => c.rut) ?? [])
    const vppRuts = new Set(vpp?.map(v => v.rut) ?? [])
    const mppRuts = new Set(mpp?.map(m => m.rut) ?? [])

    setRows((sales ?? []).map(s => ({
      id: s.id,
      customer_name: s.customer_name,
      rut: s.rut,
      model: s.model,
      sale_month: s.sale_month,
      hasCredit: creditRuts.has(s.rut),
      hasVpp: vppRuts.has(s.rut),
      hasMpp: mppRuts.has(s.rut),
    })))
    setLoading(false)
  }

  function getSaleMonth(dateStr: string) {
    const d = new Date(dateStr)
    return MONTHS[d.getUTCMonth()]
  }

  function getSaleYear(dateStr: string) {
    return new Date(dateStr).getUTCFullYear()
  }

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Cartera de Clientes — {selectedYear}</Text>
          <AlertBell />
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView style={styles.tableContainer}>
            {rows.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No hay ventas en {selectedYear}</Text>
              </View>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.cell, styles.cellN, styles.headCell]}>#</Text>
                  <Text style={[styles.cell, styles.cellName, styles.headCell]}>Cliente</Text>
                  <Text style={[styles.cell, styles.cellRut, styles.headCell]}>RUT</Text>
                  <Text style={[styles.cell, styles.cellModel, styles.headCell]}>Modelo</Text>
                  <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>Crédito</Text>
                  <Text style={[styles.cell, styles.cellYear, styles.headCell]}>Año</Text>
                  <Text style={[styles.cell, styles.cellMonth, styles.headCell]}>Mes</Text>
                  <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>VPP</Text>
                  <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>MPP</Text>
                </View>
                {rows.map((row, index) => (
                  <View key={row.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.cell, styles.cellN]}>{index + 1}</Text>
                    <Text style={[styles.cell, styles.cellName]}>{row.customer_name}</Text>
                    <Text style={[styles.cell, styles.cellRut]}>{row.rut}</Text>
                    <Text style={[styles.cell, styles.cellModel]} numberOfLines={1}>{row.model}</Text>
                    <View style={[styles.cell, styles.cellFlag]}>
                      <View style={[styles.badge, { backgroundColor: row.hasCredit ? Colors.success : '#BDC3C7' }]}>
                        <Text style={styles.badgeText}>{row.hasCredit ? 'Sí' : 'No'}</Text>
                      </View>
                    </View>
                    <Text style={[styles.cell, styles.cellYear]}>{getSaleYear(row.sale_month)}</Text>
                    <Text style={[styles.cell, styles.cellMonth]}>{getSaleMonth(row.sale_month)}</Text>
                    <View style={[styles.cell, styles.cellFlag]}>
                      <View style={[styles.badge, { backgroundColor: row.hasVpp ? Colors.success : '#BDC3C7' }]}>
                        <Text style={styles.badgeText}>{row.hasVpp ? 'Sí' : 'No'}</Text>
                      </View>
                    </View>
                    <View style={[styles.cell, styles.cellFlag]}>
                      <View style={[styles.badge, { backgroundColor: row.hasMpp ? Colors.success : '#BDC3C7' }]}>
                        <Text style={styles.badgeText}>{row.hasMpp ? 'Sí' : 'No'}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  main: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  tableContainer: { flex: 1, paddingHorizontal: 32, paddingTop: 12 },
  table: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  tableHead: { backgroundColor: Colors.primary },
  rowEven: { backgroundColor: Colors.white },
  rowOdd: { backgroundColor: '#F8F9FA' },
  cell: { fontSize: 13, color: Colors.text, paddingHorizontal: 6 },
  headCell: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  cellN: { width: 36 },
  cellName: { flex: 2 },
  cellRut: { flex: 1.2 },
  cellModel: { flex: 1.8 },
  cellFlag: { width: 70, alignItems: 'center' },
  cellYear: { width: 55, textAlign: 'center' },
  cellMonth: { width: 90 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: Colors.textLight, fontSize: 15 },
})
