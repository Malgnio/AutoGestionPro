import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

const SALES_COMMISSION = [
  { min: 15, max: Infinity, rate: 0.12, label: '15 o más' },
  { min: 12, max: 14, rate: 0.10, label: '12 - 14' },
  { min: 9, max: 11, rate: 0.09, label: '9 - 11' },
  { min: 6, max: 8, rate: 0.08, label: '6 - 8' },
  { min: 1, max: 5, rate: 0.06, label: '1 - 5' },
]

const CREDIT_COMMISSION = [
  { min: 9, max: Infinity, rate: 0.17, label: '9 o más' },
  { min: 8, max: 8, rate: 0.16, label: '8' },
  { min: 6, max: 7, rate: 0.12, label: '6 - 7' },
  { min: 3, max: 5, rate: 0.10, label: '3 - 5' },
  { min: 2, max: 2, rate: 0.05, label: '2' },
  { min: 1, max: 1, rate: 0.04, label: '1' },
]

function getSalesRate(u: number) { return SALES_COMMISSION.find(r => u >= r.min && u <= r.max)?.rate ?? 0 }
function getCreditRate(c: number) { return CREDIT_COMMISSION.find(r => c >= r.min && c <= r.max)?.rate ?? 0 }

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function CommissionsScreen() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear] = useState(new Date().getFullYear())
  const [salesCount, setSalesCount] = useState(0)
  const [creditsCount, setCreditsCount] = useState(0)
  const [totalDealer, setTotalDealer] = useState(0)

  useEffect(() => { loadData() }, [selectedMonth])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

    const [{ data: sales }, { data: credits }] = await Promise.all([
      supabase.from('sales').select('id').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('credits').select('dealer_cost').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
    ])

    setSalesCount(sales?.length ?? 0)
    setCreditsCount(credits?.length ?? 0)
    setTotalDealer(credits?.reduce((sum, c) => sum + Number(c.dealer_cost), 0) ?? 0)
    setLoading(false)
  }

  const salesRate = getSalesRate(salesCount)
  const creditRate = getCreditRate(creditsCount)
  const dealerSinIva = totalDealer * 0.81
  const creditCommission = dealerSinIva * creditRate

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Comisiones {selectedYear}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={styles.monthContainer}>
        {MONTHS.map((m, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.monthBtn, selectedMonth === i && styles.monthBtnActive]}
            onPress={() => setSelectedMonth(i)}
          >
            <Text style={[styles.monthBtnText, selectedMonth === i && styles.monthBtnTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topRow}>

            <View style={styles.tableCard}>
              <Text style={styles.cardTitle}>Comisión por Unidades</Text>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 1 }]}>Unidades</Text>
                <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>% Comisión</Text>
              </View>
              {SALES_COMMISSION.map((row, i) => {
                const active = salesCount >= row.min && salesCount <= row.max
                return (
                  <View key={i} style={[styles.tableRow, active && styles.tableRowActive]}>
                    <Text style={[styles.td, { flex: 1 }, active && styles.tdActive]}>{row.label}</Text>
                    <Text style={[styles.td, { width: 80, textAlign: 'right' }, active && styles.tdActive]}>{(row.rate * 100).toFixed(0)}%</Text>
                  </View>
                )
              })}
              <View style={styles.resultBox}>
                <Text style={styles.resultText}>
                  {salesCount} unidades → tasa <Text style={{ fontWeight: 'bold' }}>{(salesRate * 100).toFixed(0)}%</Text>
                </Text>
              </View>
            </View>

            <View style={styles.tableCard}>
              <Text style={styles.cardTitle}>Comisión por Créditos</Text>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 1 }]}>N° Créditos</Text>
                <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>% Comisión</Text>
              </View>
              {CREDIT_COMMISSION.map((row, i) => {
                const active = creditsCount >= row.min && creditsCount <= row.max
                return (
                  <View key={i} style={[styles.tableRow, active && styles.tableRowActive]}>
                    <Text style={[styles.td, { flex: 1 }, active && styles.tdActive]}>{row.label}</Text>
                    <Text style={[styles.td, { width: 80, textAlign: 'right' }, active && styles.tdActive]}>{(row.rate * 100).toFixed(0)}%</Text>
                  </View>
                )
              })}
              <View style={styles.resultBox}>
                <Text style={styles.resultText}>
                  {creditsCount} créditos → tasa <Text style={{ fontWeight: 'bold' }}>{(creditRate * 100).toFixed(0)}%</Text>
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Resumen {MONTHS[selectedMonth]}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total C. Dealer</Text>
                <Text style={styles.summaryValue}>${Math.round(totalDealer).toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>C. Dealer sin IVA (−19%)</Text>
                <Text style={styles.summaryValue}>${Math.round(dealerSinIva).toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tasa créditos ({creditsCount} créd.)</Text>
                <Text style={styles.summaryValue}>{(creditRate * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Unidades vendidas</Text>
                <Text style={styles.summaryValue}>{salesCount} → {(salesRate * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Comisión a pagar</Text>
                <Text style={styles.totalValue}>${Math.round(creditCommission).toLocaleString('es-CL')}</Text>
              </View>
            </View>

          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  monthScroll: { maxHeight: 52, paddingLeft: 32 },
  monthContainer: { paddingRight: 32, paddingVertical: 10, gap: 8 },
  monthBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  monthBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  monthBtnText: { fontSize: 13, color: Colors.textLight },
  monthBtnTextActive: { color: Colors.white, fontWeight: 'bold' },
  content: { padding: 32, gap: 20 },
  topRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  tableCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  summaryCard: { flex: 1, backgroundColor: Colors.primary, borderRadius: 12, padding: 24 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  tableHead: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: Colors.border, marginBottom: 4 },
  th: { fontSize: 12, fontWeight: 'bold', color: Colors.textLight, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  tableRowActive: { backgroundColor: Colors.primary },
  td: { fontSize: 14, color: Colors.text },
  tdActive: { color: Colors.white, fontWeight: 'bold' },
  resultBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  resultText: { fontSize: 13, color: Colors.secondary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 14, color: Colors.white, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.accent },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: Colors.accent },
})
