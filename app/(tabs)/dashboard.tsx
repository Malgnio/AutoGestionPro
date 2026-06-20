import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import PeriodSelector from '../../components/PeriodSelector'

const SALES_COMMISSION = [
  { min: 15, max: Infinity, rate: 0.12 },
  { min: 12, max: 14, rate: 0.10 },
  { min: 9, max: 11, rate: 0.09 },
  { min: 6, max: 8, rate: 0.08 },
  { min: 1, max: 5, rate: 0.06 },
]

const CREDIT_COMMISSION = [
  { min: 9, max: Infinity, rate: 0.17 },
  { min: 8, max: 8, rate: 0.16 },
  { min: 6, max: 7, rate: 0.12 },
  { min: 3, max: 5, rate: 0.10 },
  { min: 2, max: 2, rate: 0.05 },
  { min: 1, max: 1, rate: 0.04 },
]

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function getSalesRate(units: number) {
  return SALES_COMMISSION.find(r => units >= r.min && units <= r.max)?.rate ?? 0
}

function getCreditRate(count: number) {
  return CREDIT_COMMISSION.find(r => count >= r.min && count <= r.max)?.rate ?? 0
}

export default function DashboardScreen() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [loading, setLoading] = useState(true)
  const [salesCount, setSalesCount] = useState(0)
  const [creditsCount, setCreditsCount] = useState(0)
  const [totalDealer, setTotalDealer] = useState(0)

  useEffect(() => { loadData() }, [selectedYear, selectedMonth])

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
  const penetration = salesCount > 0 ? Math.round((creditsCount / salesCount) * 100) : 0

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Resumen — <Text style={styles.monthLabel}>{MONTHS[selectedMonth]} {selectedYear}</Text></Text>
      </View>

      <PeriodSelector
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
      />

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: Colors.secondary }]}>
                <Text style={styles.statLabel}>Unidades vendidas</Text>
                <Text style={styles.statValue}>{salesCount}</Text>
                <Text style={styles.statSub}>Tasa: {(salesRate * 100).toFixed(0)}%</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.success }]}>
                <Text style={styles.statLabel}>Créditos</Text>
                <Text style={styles.statValue}>{creditsCount}</Text>
                <Text style={styles.statSub}>Tasa: {(creditRate * 100).toFixed(0)}%</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.accent }]}>
                <Text style={styles.statLabel}>Penetración crédito</Text>
                <Text style={styles.statValue}>{penetration}%</Text>
                <Text style={styles.statSub}>Meta: 50%</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
                <Text style={styles.statLabel}>Comisión a pagar</Text>
                <Text style={styles.statValue}>${Math.round(creditCommission).toLocaleString('es-CL')}</Text>
                <Text style={styles.statSub}>C.Dealer sin IVA × {(creditRate * 100).toFixed(0)}%</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Detalle comisiones</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total C. Dealer</Text>
                  <Text style={styles.summaryValue}>${totalDealer.toLocaleString('es-CL')}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>C. Dealer sin IVA (−19%)</Text>
                  <Text style={styles.summaryValue}>${Math.round(dealerSinIva).toLocaleString('es-CL')}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Tasa por créditos ({creditsCount} créditos)</Text>
                  <Text style={styles.summaryValue}>{(creditRate * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Comisión a pagar</Text>
                  <Text style={[styles.summaryValue, { color: Colors.success }]}>${Math.round(creditCommission).toLocaleString('es-CL')}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { padding: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  monthLabel: { color: Colors.textLight, fontWeight: 'normal' },
  scrollArea: { flex: 1 },
  content: { padding: 32, gap: 24 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 24 },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  statSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  summaryCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 28, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  summaryItem: { minWidth: 200, flex: 1 },
  summaryLabel: { fontSize: 13, color: Colors.textLight, marginBottom: 6 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
})
