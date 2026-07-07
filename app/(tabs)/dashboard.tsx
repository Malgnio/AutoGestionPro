import { useEffect, useState } from 'react'
import { useWindowDimensions, View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import { usePeriod } from '../../contexts/PeriodContext'
import AlertBell from '../../components/AlertBell'
import * as XLSX from 'xlsx'
import { createPortal } from 'react-dom'

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
const MPP_COMMISSION: Record<string, number> = { Platinium: 16000, Diamond: 21000, Zafiro: 26000 }
const VPP_COMMISSION = 70000

function getSalesRate(u: number) { return SALES_COMMISSION.find(r => u >= r.min && u <= r.max)?.rate ?? 0 }
function getCreditRate(c: number) { return CREDIT_COMMISSION.find(r => c >= r.min && c <= r.max)?.rate ?? 0 }

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

type MonthData = {
  sales: number
  credits: number
  dealer: number
  vpp: number
  mppCommission: number
  mppCount: number
  insurance: number
}

const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function DashboardScreen() {
  const { width } = useWindowDimensions()
  const isMobile = width < 768
  const { selectedYear, setSelectedYear, availableYears, addYear, selectedMonth, setSelectedMonth } = usePeriod()
  const nextYear = Math.max(...availableYears) + 1
  const [loading, setLoading] = useState(true)
  const [monthData, setMonthData] = useState<MonthData[]>(Array(12).fill({ sales: 0, credits: 0, dealer: 0, vpp: 0, mppCommission: 0, mppCount: 0, insurance: 0 }))
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)
  const [avgTarget, setAvgTarget] = useState(70)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadData() }, [selectedYear])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = `${selectedYear}-01-01`
    const end = `${selectedYear}-12-31`

    const [{ data: sales }, { data: credits }, { data: vpp }, { data: mpp }, { data: insurance }, { data: targets }] = await Promise.all([
      supabase.from('sales').select('sale_month').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('credits').select('sale_month, dealer_cost').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('vpp').select('sale_month').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('mpp').select('sale_month, product_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('insurance').select('sale_month').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('targets').select('month, value').eq('user_id', user.id).eq('metric', 'credit_penetration').gte('month', start).lte('month', end),
    ])

    const data: MonthData[] = Array.from({ length: 12 }, () => ({ sales: 0, credits: 0, dealer: 0, vpp: 0, mppCommission: 0, mppCount: 0, insurance: 0 }))

    sales?.forEach(s => { const m = new Date(s.sale_month).getUTCMonth(); data[m].sales += 1 })
    credits?.forEach(c => { const m = new Date(c.sale_month).getUTCMonth(); data[m].credits += 1; data[m].dealer += Number(c.dealer_cost) })
    vpp?.forEach(v => { const m = new Date(v.sale_month).getUTCMonth(); data[m].vpp += 1 })
    mpp?.forEach(v => { const m = new Date(v.sale_month).getUTCMonth(); data[m].mppCommission += MPP_COMMISSION[v.product_type] ?? 0; data[m].mppCount += 1 })
    insurance?.forEach(v => { const m = new Date(v.sale_month).getUTCMonth(); data[m].insurance += 1 })

    setMonthData(data)

    const targetValues = Array.from({ length: 12 }, (_, i) => {
      const month = `${selectedYear}-${String(i + 1).padStart(2, '0')}-01`
      const found = targets?.find(t => t.month.startsWith(month.slice(0, 7)))
      return found ? found.value : 70
    })
    setAvgTarget(Math.round(targetValues.reduce((s, v) => s + v, 0) / 12))

    setLoading(false)
  }

  const totalSales = monthData.reduce((s, m) => s + m.sales, 0)
  const totalCredits = monthData.reduce((s, m) => s + m.credits, 0)
  const totalVpp = monthData.reduce((s, m) => s + m.vpp, 0)
  const totalMppCommission = monthData.reduce((s, m) => s + m.mppCommission, 0)
  const totalMppCount = monthData.reduce((s, m) => s + m.mppCount, 0)
  const penetration = totalSales > 0 ? Math.round((totalCredits / totalSales) * 100) : 0

  const totalInsurance = monthData.reduce((s, m) => s + m.insurance, 0)
  const totalCreditCommission = monthData.reduce((sum, m) => sum + m.dealer / 1.19 * getCreditRate(m.credits), 0)
  const totalVppCommission = totalVpp * VPP_COMMISSION
  const totalInsuranceCommission = totalInsurance * 23000
  const totalCommission = totalCreditCommission + totalVppCommission + totalMppCommission + totalInsuranceCommission

  const maxBar = Math.max(...monthData.map(m => Math.max(m.sales, m.credits, m.vpp, m.mppCount)), 1)
  const BAR_HEIGHT = 140

  async function fetchMonthDetail(year: number, month: number, userId: string) {
    const start = new Date(year, month, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0]
    const [{ data: sales }, { data: credits }, { data: insurance }, { data: vpp }, { data: mpp }] = await Promise.all([
      supabase.from('sales').select('customer_name, rut, model, chassis, odv, purchase_type, status').eq('user_id', userId).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
      supabase.from('credits').select('customer_name, rut, dealer_cost, credit_type').eq('user_id', userId).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
      supabase.from('insurance').select('customer_name, rut, chassis, insurance_type').eq('user_id', userId).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
      supabase.from('vpp').select('client_name, rut, ppu').eq('user_id', userId).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
      supabase.from('mpp').select('client_name, rut, product_type').eq('user_id', userId).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    ])
    return { sales: sales ?? [], credits: credits ?? [], insurance: insurance ?? [], vpp: vpp ?? [], mpp: mpp ?? [] }
  }

  function buildSheets(monthLabel: string, data: Awaited<ReturnType<typeof fetchMonthDetail>>, mIdx: number) {
    const { sales, credits, insurance, vpp, mpp } = data
    const creditCount = credits.length
    const dealerTotal = credits.reduce((s, c) => s + Number(c.dealer_cost), 0)
    const penetration = sales.length > 0 ? Math.round((creditCount / sales.length) * 100) : 0
    const creditComm = Math.round(dealerTotal / 1.19 * getCreditRate(creditCount))
    const vppComm = vpp.length * VPP_COMMISSION
    const insuranceComm = insurance.length * 23000
    const mppComm = mpp.reduce((s, m: any) => s + (MPP_COMMISSION[m.product_type] ?? 0), 0)
    const salesComm = sales.length * 70000

    const resumen = [
      ['Mes', monthLabel],
      [],
      ['Métrica', 'Cantidad', 'Comisión'],
      ['Ventas', sales.length, salesComm],
      ['Créditos', creditCount, creditComm],
      ['Penetración crédito', `${penetration}%`, ''],
      ['Seguros', insurance.length, insuranceComm],
      ['VPP', vpp.length, vppComm],
      ['MPP', mpp.length, mppComm],
      [],
      ['Total comisión', '', salesComm + creditComm + insuranceComm + vppComm + mppComm],
    ]

    const ventasRows = [
      ['#', 'Cliente', 'RUT', 'Modelo', 'Chasis', 'OdV', 'Tipo', 'Estado'],
      ...sales.map((s: any, i: number) => [i + 1, s.customer_name, s.rut, s.model, s.chassis, s.odv, s.purchase_type, s.status ?? '']),
    ]

    const creditosRows = [
      ['#', 'Cliente', 'RUT', 'C.Dealer', 'Tipo'],
      ...credits.map((c: any, i: number) => [i + 1, c.customer_name, c.rut, Number(c.dealer_cost), c.credit_type]),
    ]

    const segurosRows = [
      ['#', 'Cliente', 'RUT', 'Chasis', 'Tipo'],
      ...insurance.map((s: any, i: number) => [i + 1, s.customer_name, s.rut, s.chassis, s.insurance_type]),
    ]

    const vppRows = [
      ['#', 'Cliente', 'RUT', 'PPU'],
      ...vpp.map((v: any, i: number) => [i + 1, v.client_name, v.rut, v.ppu]),
    ]

    const mppRows = [
      ['#', 'Cliente', 'RUT', 'Tipo Producto'],
      ...mpp.map((m: any, i: number) => [i + 1, m.client_name, m.rut, m.product_type]),
    ]

    return { resumen, ventasRows, creditosRows, segurosRows, vppRows, mppRows }
  }

  async function handleExportMonth() {
    setExporting(true); setShowExportMenu(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setExporting(false); return }
    const monthLabel = `${MONTHS_FULL[selectedMonth]} ${selectedYear}`
    const data = await fetchMonthDetail(selectedYear, selectedMonth, user.id)
    const { resumen, ventasRows, creditosRows, segurosRows, vppRows, mppRows } = buildSheets(monthLabel, data, selectedMonth)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ventasRows), 'Ventas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(creditosRows), 'Créditos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(segurosRows), 'Seguros')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vppRows), 'VPP')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mppRows), 'MPP')
    XLSX.writeFile(wb, `AutoGestion_${MONTHS_FULL[selectedMonth]}_${selectedYear}.xlsx`)
    setExporting(false)
  }

  async function handleExportYear() {
    setExporting(true); setShowExportMenu(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setExporting(false); return }

    const wb = XLSX.utils.book_new()
    const allVentas: any[][] = [['Mes', '#', 'Cliente', 'RUT', 'Modelo', 'Chasis', 'OdV', 'Tipo', 'Estado']]
    const allCreditos: any[][] = [['Mes', '#', 'Cliente', 'RUT', 'C.Dealer', 'Tipo']]
    const allSeguros: any[][] = [['Mes', '#', 'Cliente', 'RUT', 'Chasis', 'Tipo']]
    const allVpp: any[][] = [['Mes', '#', 'Cliente', 'RUT', 'PPU']]
    const allMpp: any[][] = [['Mes', '#', 'Cliente', 'RUT', 'Tipo Producto']]
    const resumenAnual: any[][] = [['Mes', 'Ventas', 'Créditos', 'Penetración', 'Seguros', 'VPP', 'MPP', 'Comisión Total']]

    for (let m = 0; m < 12; m++) {
      const data = await fetchMonthDetail(selectedYear, m, user.id)
      const { sales, credits, insurance, vpp, mpp } = data
      const monthLabel = MONTHS_FULL[m]
      const creditCount = credits.length
      const dealerTotal = credits.reduce((s, c) => s + Number(c.dealer_cost), 0)
      const penetration = sales.length > 0 ? Math.round((creditCount / sales.length) * 100) : 0
      const creditComm = Math.round(dealerTotal / 1.19 * getCreditRate(creditCount))
      const vppComm = vpp.length * VPP_COMMISSION
      const insuranceComm = insurance.length * 23000
      const mppComm = mpp.reduce((s, x: any) => s + (MPP_COMMISSION[x.product_type] ?? 0), 0)
      const salesComm = sales.length * 70000
      resumenAnual.push([monthLabel, sales.length, creditCount, `${penetration}%`, insurance.length, vpp.length, mpp.length, salesComm + creditComm + insuranceComm + vppComm + mppComm])
      sales.forEach((s: any, i: number) => allVentas.push([monthLabel, i + 1, s.customer_name, s.rut, s.model, s.chassis, s.odv, s.purchase_type, s.status ?? '']))
      credits.forEach((c: any, i: number) => allCreditos.push([monthLabel, i + 1, c.customer_name, c.rut, Number(c.dealer_cost), c.credit_type]))
      insurance.forEach((s: any, i: number) => allSeguros.push([monthLabel, i + 1, s.customer_name, s.rut, s.chassis, s.insurance_type]))
      vpp.forEach((v: any, i: number) => allVpp.push([monthLabel, i + 1, v.client_name, v.rut, v.ppu]))
      mpp.forEach((x: any, i: number) => allMpp.push([monthLabel, i + 1, x.client_name, x.rut, x.product_type]))
    }

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenAnual), 'Resumen Anual')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allVentas), 'Ventas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allCreditos), 'Créditos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allSeguros), 'Seguros')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allVpp), 'VPP')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allMpp), 'MPP')
    XLSX.writeFile(wb, `AutoGestion_${selectedYear}.xlsx`)
    setExporting(false)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
        <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Resumen Anual</Text>
        <View style={[styles.topBarRight, isMobile && styles.topBarRightMobile]}>
          <View style={[styles.yearRow, isMobile && styles.yearRowMobile]}>
            {availableYears.map(y => (
              <TouchableOpacity key={y} style={[styles.yearBtn, selectedYear === y && styles.yearBtnActive]} onPress={() => setSelectedYear(y)}>
                <Text style={[styles.yearBtnText, selectedYear === y && styles.yearBtnTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addYearBtn} onPress={() => { addYear(nextYear); setSelectedYear(nextYear) }}>
              <Text style={styles.addYearBtnText}>+ {nextYear}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => setShowExportMenu(v => !v)}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.exportBtnText}>⬇ Exportar</Text>
            }
          </TouchableOpacity>
          <AlertBell />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>

          {/* KPIs */}
          <View style={[styles.kpiRow, isMobile && styles.kpiRowMobile]}>
            <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: Colors.secondary }]}>
              <Text style={styles.kpiLabel}>Unidades vendidas</Text>
              <Text style={styles.kpiValue}>{totalSales}</Text>
              <Text style={styles.kpiSub}>${(totalSales * 70000).toLocaleString('es-CL')} comisión</Text>
            </View>
            <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: Colors.success }]}>
              <Text style={styles.kpiLabel}>Créditos</Text>
              <Text style={styles.kpiValue}>{totalCredits}</Text>
              <Text style={styles.kpiSub}>${Math.round(totalCreditCommission).toLocaleString('es-CL')} comisión</Text>
            </View>
            <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: penetration >= 70 ? Colors.success : penetration >= 50 ? Colors.accent : '#C0392B' }]}>
              <Text style={styles.kpiLabel}>Penetración crédito</Text>
              <Text style={styles.kpiValue}>{penetration}%</Text>
              <Text style={styles.kpiSub}>Meta promedio: {avgTarget}%</Text>
            </View>
            <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: '#E67E22' }]}>
              <Text style={styles.kpiLabel}>Seguros en el año</Text>
              <Text style={styles.kpiValue}>{totalInsurance}</Text>
              <Text style={styles.kpiSub}>${totalInsuranceCommission.toLocaleString('es-CL')} comisión</Text>
            </View>
            <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: Colors.primary }]}>
              <Text style={styles.kpiLabel}>VPP en el año</Text>
              <Text style={styles.kpiValue}>{totalVpp}</Text>
              <Text style={styles.kpiSub}>${totalVppCommission.toLocaleString('es-CL')} comisión</Text>
            </View>
            <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: '#2471A3' }]}>
              <Text style={styles.kpiLabel}>MPP en el año</Text>
              <Text style={styles.kpiValue}>{totalMppCount}</Text>
              <Text style={styles.kpiSub}>${totalMppCommission.toLocaleString('es-CL')} comisión</Text>
            </View>
          </View>

          {/* Gráfico */}
          <View style={styles.chartCard}>
            <View style={[styles.chartHeader, isMobile && styles.chartHeaderMobile]}>
              <Text style={styles.chartTitle}>Actividad mensual — {selectedYear}</Text>
              <View style={[styles.legend, isMobile && styles.legendMobile]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
                  <Text style={styles.legendText}>Unidades</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.legendText}>Créditos</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.legendText}>VPP</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2471A3' }]} />
                  <Text style={styles.legendText}>MPP</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#E67E22' }]} />
                  <Text style={styles.legendText}>Seguros</Text>
                </View>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.chartWrapper, isMobile && { minWidth: 600 }]}>
                <View style={styles.chart}>
                  {monthData.map((m, i) => {
                    const isHovered = hoveredMonth === i
                    const creditComision = Math.round(m.dealer / 1.19 * getCreditRate(m.credits))
                    const vppComision = m.vpp * VPP_COMMISSION
                    const insuranceComision = m.insurance * 23000
                    const totalMes = creditComision + vppComision + m.mppCommission + insuranceComision
                    return (
                      <View
                        key={i}
                        style={[styles.barGroup, isHovered && { zIndex: 100 } as any]}
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
                              <View style={[styles.tooltipDot, { backgroundColor: Colors.primary }]} />
                              <Text style={styles.tooltipText}>VPP: <Text style={styles.tooltipBold}>{m.vpp}</Text></Text>
                            </View>
                            <View style={styles.tooltipRow}>
                              <View style={[styles.tooltipDot, { backgroundColor: '#2471A3' }]} />
                              <Text style={styles.tooltipText}>MPP: <Text style={styles.tooltipBold}>{m.mppCount}</Text></Text>
                            </View>
                            <View style={styles.tooltipRow}>
                              <View style={[styles.tooltipDot, { backgroundColor: '#E67E22' }]} />
                              <Text style={styles.tooltipText}>Seguros: <Text style={styles.tooltipBold}>{m.insurance}</Text></Text>
                            </View>
                            {totalMes > 0 && (
                              <View style={[styles.tooltipRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6, marginTop: 2 }]}>
                                <Text style={[styles.tooltipText, { color: Colors.accent }]}>Comisión total: <Text style={[styles.tooltipBold, { color: Colors.accent }]}>${totalMes.toLocaleString('es-CL')}</Text></Text>
                              </View>
                            )}
                          </View>
                        )}
                        <View style={styles.bars}>
                          <View style={styles.barWrapper}>
                            <Text style={styles.barVal}>{m.sales > 0 ? m.sales : ''}</Text>
                            <View style={[styles.bar, { height: Math.max(Math.round((m.sales / maxBar) * BAR_HEIGHT), m.sales > 0 ? 2 : 0), backgroundColor: isHovered ? '#1a6ba0' : Colors.secondary }]} />
                          </View>
                          <View style={styles.barWrapper}>
                            <Text style={styles.barVal}>{m.credits > 0 ? m.credits : ''}</Text>
                            <View style={[styles.bar, { height: Math.max(Math.round((m.credits / maxBar) * BAR_HEIGHT), m.credits > 0 ? 2 : 0), backgroundColor: isHovered ? '#27AE60' : Colors.success }]} />
                          </View>
                          <View style={styles.barWrapper}>
                            <Text style={styles.barVal}>{m.vpp > 0 ? m.vpp : ''}</Text>
                            <View style={[styles.bar, { height: Math.max(Math.round((m.vpp / maxBar) * BAR_HEIGHT), m.vpp > 0 ? 2 : 0), backgroundColor: isHovered ? '#0d3b5e' : Colors.primary }]} />
                          </View>
                          <View style={styles.barWrapper}>
                            <Text style={styles.barVal}>{m.mppCount > 0 ? m.mppCount : ''}</Text>
                            <View style={[styles.bar, { height: Math.max(Math.round((m.mppCount / maxBar) * BAR_HEIGHT), m.mppCount > 0 ? 2 : 0), backgroundColor: '#2471A3' }]} />
                          </View>
                          <View style={styles.barWrapper}>
                            <Text style={styles.barVal}>{m.insurance > 0 ? m.insurance : ''}</Text>
                            <View style={[styles.bar, { height: Math.max(Math.round((m.insurance / maxBar) * BAR_HEIGHT), m.insurance > 0 ? 2 : 0), backgroundColor: '#E67E22' }]} />
                          </View>
                        </View>
                        <Text style={[styles.barLabel, isHovered && { color: Colors.primary, fontWeight: 'bold' }]}>{MONTH_LABELS[i]}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            </ScrollView>
          </View>

        </ScrollView>
      )}
      {showExportMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div onClick={() => setShowExportMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 9000 }} />
          <div style={{
            position: 'fixed', top: 60, right: 80, zIndex: 9001,
            backgroundColor: 'white', borderRadius: 10, border: `1px solid ${Colors.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 240, overflow: 'hidden',
          }}>
            <div
              onClick={handleExportMonth}
              style={{ padding: 16, cursor: 'pointer', borderBottom: `1px solid ${Colors.border}` }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: Colors.text, marginBottom: 3 }}>📅 Mes específico</div>
              <div style={{ fontSize: 12, color: Colors.textLight }}>{MONTHS_FULL[selectedMonth]} {selectedYear}</div>
            </div>
            <div
              onClick={handleExportYear}
              style={{ padding: 16, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: Colors.text, marginBottom: 3 }}>📆 Año completo</div>
              <div style={{ fontSize: 12, color: Colors.textLight }}>Todos los meses de {selectedYear}</div>
            </div>
          </div>
        </>,
        document.body
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32, paddingBottom: 16 },
  topBarMobile: { flexDirection: 'column', alignItems: 'flex-start', padding: 16, paddingBottom: 8, gap: 12 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarRightMobile: { width: '100%', justifyContent: 'space-between' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  pageTitleMobile: { fontSize: 20 },
  yearRow: { flexDirection: 'row', gap: 8 },
  yearRowMobile: { flexWrap: 'wrap', gap: 6 },
  yearBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  yearBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  yearBtnText: { fontSize: 13, color: Colors.textLight },
  yearBtnTextActive: { color: Colors.white, fontWeight: 'bold' },
  addYearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' } as any,
  addYearBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  exportBtn: { backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 110, alignItems: 'center' },
  exportBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 13 },
  scrollArea: { flex: 1 },
  content: { padding: 32, gap: 16 },
  contentMobile: { padding: 16, gap: 12 },
  kpiRow: { flexDirection: 'row', gap: 16 },
  kpiRowMobile: { flexWrap: 'wrap', gap: 10 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 24 },
  kpiCardMobile: { flexBasis: '47%', flex: 0, padding: 16 },
  kpiLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  kpiValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  kpiSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  chartCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 28, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  chartHeaderMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  chartTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
  legend: { flexDirection: 'row', gap: 16 },
  legendMobile: { flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLine: { width: 20, height: 3, borderRadius: 2 },
  legendText: { fontSize: 12, color: Colors.textLight },
  chartWrapper: { position: 'relative' as any, overflow: 'visible' as any },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 4, overflow: 'visible' as any },
  lineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, borderWidth: 2, borderColor: Colors.white, zIndex: 1 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4, zIndex: 1, minWidth: 44 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 150 },
  barWrapper: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 14, borderRadius: 3, minHeight: 2 },
  barVal: { fontSize: 9, color: Colors.textLight, marginBottom: 2 },
  barLabel: { fontSize: 10, color: Colors.textLight, textAlign: 'center' },
  tooltip: {
    position: 'absolute' as any, bottom: 50, zIndex: 200,
    backgroundColor: Colors.white, borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: Colors.border, minWidth: 170,
  },
  tooltipCenter: { left: '50%' as any, transform: [{ translateX: -85 }] },
  tooltipLeft: { right: 0 },
  tooltipMonth: { fontSize: 13, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tooltipDot: { width: 8, height: 8, borderRadius: 4 },
  tooltipText: { fontSize: 12, color: Colors.textLight },
  tooltipBold: { fontWeight: 'bold', color: Colors.text },
})
