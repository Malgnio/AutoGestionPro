import { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

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

function getSalesRate(u: number) { return SALES_COMMISSION.find(r => u >= r.min && u <= r.max)?.rate ?? 0 }
function getCreditRate(c: number) { return CREDIT_COMMISSION.find(r => c >= r.min && c <= r.max)?.rate ?? 0 }

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const YEARS = [new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear()]

type MonthData = {
  sales: number
  credits: number
  dealer: number
}

export default function DashboardScreen() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [monthData, setMonthData] = useState<MonthData[]>(Array(12).fill({ sales: 0, credits: 0, dealer: 0 }))

  useEffect(() => { loadData() }, [selectedYear])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = `${selectedYear}-01-01`
    const end = `${selectedYear}-12-31`

    const [{ data: sales }, { data: credits }] = await Promise.all([
      supabase.from('sales').select('sale_month').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('credits').select('sale_month, dealer_cost').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
    ])

    const data: MonthData[] = Array.from({ length: 12 }, () => ({ sales: 0, credits: 0, dealer: 0 }))

    sales?.forEach(s => {
      const m = new Date(s.sale_month).getUTCMonth()
      data[m].sales += 1
    })
    credits?.forEach(c => {
      const m = new Date(c.sale_month).getUTCMonth()
      data[m].credits += 1
      data[m].dealer += Number(c.dealer_cost)
    })

    setMonthData(data)
    setLoading(false)
  }

  const totalSales = monthData.reduce((s, m) => s + m.sales, 0)
  const totalCredits = monthData.reduce((s, m) => s + m.credits, 0)
  const totalDealer = monthData.reduce((s, m) => s + m.dealer, 0)
  const penetration = totalSales > 0 ? Math.round((totalCredits / totalSales) * 100) : 0

  // Comisión anual: suma de comisión por mes
  const totalCommission = monthData.reduce((sum, m) => {
    const rate = getCreditRate(m.credits)
    return sum + m.dealer * 0.81 * rate
  }, 0)

  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)

  const maxSales = Math.max(...monthData.map(m => m.sales), 1)
  const maxCredits = Math.max(...monthData.map(m => m.credits), 1)
  const maxBar = Math.max(maxSales, maxCredits)

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Resumen</Text>
        <View style={styles.yearRow}>
          {YEARS.map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.yearBtn, selectedYear === y && styles.yearBtnActive]}
              onPress={() => setSelectedYear(y)}
            >
              <Text style={[styles.yearBtnText, selectedYear === y && styles.yearBtnTextActive]}>FY{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content}>

          {/* KPIs anuales */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: Colors.secondary }]}>
              <Text style={styles.kpiLabel}>Unidades vendidas</Text>
              <Text style={styles.kpiValue}>{totalSales}</Text>
              <Text style={styles.kpiSub}>Tasa: {(getSalesRate(totalSales) * 100).toFixed(0)}%</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: Colors.success }]}>
              <Text style={styles.kpiLabel}>Créditos</Text>
              <Text style={styles.kpiValue}>{totalCredits}</Text>
              <Text style={styles.kpiSub}>Tasa: {(getCreditRate(totalCredits) * 100).toFixed(0)}%</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: Colors.accent }]}>
              <Text style={styles.kpiLabel}>Penetración crédito</Text>
              <Text style={styles.kpiValue}>{penetration}%</Text>
              <Text style={styles.kpiSub}>Meta: 50%</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: Colors.primary }]}>
              <Text style={styles.kpiLabel}>Comisión anual</Text>
              <Text style={styles.kpiValue}>${Math.round(totalCommission).toLocaleString('es-CL')}</Text>
              <Text style={styles.kpiSub}>C.Dealer sin IVA × tasa</Text>
            </View>
          </View>

          {/* Gráfico barras */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Ventas y créditos por mes — {selectedYear}</Text>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
                  <Text style={styles.legendText}>Unidades</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.legendText}>Créditos</Text>
                </View>
              </View>
            </View>

            <View style={styles.chart}>
              {monthData.map((m, i) => {
                const isHovered = hoveredMonth === i
                const rate = getCreditRate(m.credits)
                const comision = Math.round(m.dealer * 0.81 * rate)
                const penetracion = m.sales > 0 ? Math.round((m.credits / m.sales) * 100) : 0
                return (
                  <View
                    key={i}
                    style={styles.barGroup}
                    // @ts-ignore
                    onMouseEnter={() => setHoveredMonth(i)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {isHovered && (
                      <View style={[styles.tooltip, i >= 9 ? styles.tooltipLeft : styles.tooltipCenter]}>
                        <Text style={styles.tooltipMonth}>{MONTH_LABELS[i]}-{String(selectedYear).slice(2)}</Text>
                        <View style={styles.tooltipRow}>
                          <View style={[styles.tooltipDot, { backgroundColor: Colors.secondary }]} />
                          <Text style={styles.tooltipText}>Ventas: <Text style={styles.tooltipBold}>{m.sales}</Text></Text>
                        </View>
                        <View style={styles.tooltipRow}>
                          <View style={[styles.tooltipDot, { backgroundColor: Colors.success }]} />
                          <Text style={styles.tooltipText}>Créditos: <Text style={styles.tooltipBold}>{m.credits}</Text></Text>
                        </View>
                        <View style={styles.tooltipRow}>
                          <Text style={styles.tooltipText}>Penetración: <Text style={styles.tooltipBold}>{penetracion}%</Text></Text>
                        </View>
                        {comision > 0 && (
                          <View style={styles.tooltipRow}>
                            <Text style={[styles.tooltipText, { color: Colors.success }]}>Comisión: <Text style={[styles.tooltipBold, { color: Colors.success }]}>${comision.toLocaleString('es-CL')}</Text></Text>
                          </View>
                        )}
                      </View>
                    )}
                    <View style={styles.bars}>
                      <View style={styles.barWrapper}>
                        <Text style={styles.barVal}>{m.sales > 0 ? m.sales : ''}</Text>
                        <View style={[styles.bar, { height: Math.round((m.sales / maxBar) * 140), backgroundColor: isHovered ? Colors.primary : Colors.secondary }]} />
                      </View>
                      <View style={styles.barWrapper}>
                        <Text style={styles.barVal}>{m.credits > 0 ? m.credits : ''}</Text>
                        <View style={[styles.bar, { height: Math.round((m.credits / maxBar) * 140), backgroundColor: isHovered ? '#27AE60' : Colors.success }]} />
                      </View>
                    </View>
                    <Text style={[styles.barLabel, isHovered && { color: Colors.primary, fontWeight: 'bold' }]}>{MONTH_LABELS[i]}</Text>
                  </View>
                )
              })}
            </View>
          </View>

        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  yearRow: { flexDirection: 'row', gap: 8 },
  yearBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  yearBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  yearBtnText: { fontSize: 13, color: Colors.textLight },
  yearBtnTextActive: { color: Colors.white, fontWeight: 'bold' },
  scrollArea: { flex: 1 },
  content: { padding: 32, gap: 24 },
  kpiRow: { flexDirection: 'row', gap: 16 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 24 },
  kpiLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  kpiValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  kpiSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  chartCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 28, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  chartTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: Colors.textLight },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 4 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 150 },
  barWrapper: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 14, borderRadius: 3, minHeight: 2 },
  barVal: { fontSize: 9, color: Colors.textLight, marginBottom: 2 },
  barLabel: { fontSize: 10, color: Colors.textLight, textAlign: 'center' },
  tooltip: {
    position: 'absolute' as any, bottom: 36, zIndex: 10,
    backgroundColor: Colors.white, borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: Colors.border, minWidth: 160,
  },
  tooltipCenter: { left: '50%' as any, transform: [{ translateX: -80 }] },
  tooltipLeft: { right: 0 },
  tooltipMonth: { fontSize: 13, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tooltipDot: { width: 8, height: 8, borderRadius: 4 },
  tooltipText: { fontSize: 12, color: Colors.textLight },
  tooltipBold: { fontWeight: 'bold', color: Colors.text },
})
