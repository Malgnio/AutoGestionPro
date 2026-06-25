import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import { usePeriod } from '../../contexts/PeriodContext'
import AlertBell from '../../components/AlertBell'

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

const MPP_COMMISSION: Record<string, number> = { Platinium: 16000, Diamond: 21000, Zafiro: 26000 }

function getSalesRate(u: number) { return SALES_COMMISSION.find(r => u >= r.min && u <= r.max)?.rate ?? 0 }
function getCreditRate(c: number) { return CREDIT_COMMISSION.find(r => c >= r.min && c <= r.max)?.rate ?? 0 }

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type Bonus = { id: string; description: string; amount: number }

export default function CommissionsScreen() {
  const { selectedYear, selectedMonth, setSelectedYear, setSelectedMonth } = usePeriod()
  const [loading, setLoading] = useState(true)
  const [salesCount, setSalesCount] = useState(0)
  const [creditsCount, setCreditsCount] = useState(0)
  const [totalDealer, setTotalDealer] = useState(0)
  const [insuranceCount, setInsuranceCount] = useState(0)
  const [vppCount, setVppCount] = useState(0)
  const [mppList, setMppList] = useState<{ product_type: string }[]>([])
  const [baseSalary, setBaseSalary] = useState(0)
  const [baseSalaryInput, setBaseSalaryInput] = useState('')
  const [editingSalary, setEditingSalary] = useState(false)
  const [savingSalary, setSavingSalary] = useState(false)
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [showBonusForm, setShowBonusForm] = useState(false)
  const [bonusDesc, setBonusDesc] = useState('')
  const [bonusAmount, setBonusAmount] = useState('')
  const [savingBonus, setSavingBonus] = useState(false)

  useEffect(() => { loadData() }, [selectedMonth])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]
    const monthKey = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]

    const [{ data: sales }, { data: credits }, { data: insurance }, { data: vpp }, { data: mpp }, { data: salary }, { data: bonusData }] = await Promise.all([
      supabase.from('sales').select('id').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('credits').select('dealer_cost').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('insurance').select('id').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('vpp').select('id').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('mpp').select('product_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('salaries').select('base_salary').eq('user_id', user.id).eq('month', monthKey).maybeSingle(),
      supabase.from('bonuses').select('id, description, amount').eq('user_id', user.id).eq('month', monthKey).order('created_at'),
    ])

    setSalesCount(sales?.length ?? 0)
    setCreditsCount(credits?.length ?? 0)
    setTotalDealer(credits?.reduce((sum, c) => sum + Number(c.dealer_cost), 0) ?? 0)
    setInsuranceCount(insurance?.length ?? 0)
    setVppCount(vpp?.length ?? 0)
    setMppList(mpp ?? [])
    setBonuses(bonusData ?? [])
    const saved = salary?.base_salary ?? 0
    setBaseSalary(saved)
    setBaseSalaryInput(saved > 0 ? String(saved) : '')
    setLoading(false)
  }

  async function handleSaveSalary() {
    setSavingSalary(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const monthKey = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const value = parseInt(baseSalaryInput.replace(/\./g, '').replace(/,/g, '')) || 0
    await supabase.from('salaries').upsert(
      { user_id: user.id, month: monthKey, base_salary: value },
      { onConflict: 'user_id,month' }
    )
    setBaseSalary(value)
    setEditingSalary(false)
    setSavingSalary(false)
  }

  async function handleAddBonus() {
    if (!bonusDesc || !bonusAmount) return
    setSavingBonus(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const monthKey = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const value = parseInt(bonusAmount.replace(/\./g, '').replace(/,/g, '')) || 0
    await supabase.from('bonuses').insert({ user_id: user.id, month: monthKey, description: bonusDesc, amount: value })
    setBonusDesc('')
    setBonusAmount('')
    setShowBonusForm(false)
    setSavingBonus(false)
    loadData()
  }

  async function handleDeleteBonus(id: string) {
    await supabase.from('bonuses').delete().eq('id', id)
    loadData()
  }

  const salesRate = getSalesRate(salesCount)
  const creditRate = getCreditRate(creditsCount)
  const dealerSinIva = totalDealer / 1.19

  const commUnidades = salesCount * 70000
  const commCreditos = dealerSinIva * creditRate
  const commSeguros = insuranceCount * 23000
  const commVpp = vppCount * 70000
  const commMpp = mppList.reduce((sum, v) => sum + (MPP_COMMISSION[v.product_type] ?? 0), 0)
  const totalBonuses = bonuses.reduce((sum, b) => sum + b.amount, 0)
  const totalCommission = commUnidades + commCreditos + commSeguros + commVpp + commMpp
  const grandTotal = baseSalary + totalCommission + totalBonuses

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Sueldo {selectedYear}</Text>
        <AlertBell />
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

              {/* Sueldo Base */}
              <View style={styles.salaryBlock}>
                <Text style={styles.salaryBlockLabel}>Sueldo Base</Text>
                {editingSalary ? (
                  <View style={styles.salaryEditRow}>
                    <TextInput
                      style={styles.salaryInput}
                      value={baseSalaryInput}
                      onChangeText={setBaseSalaryInput}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleSaveSalary} disabled={savingSalary} style={styles.salaryBtn}>
                      <Text style={styles.salaryBtnText}>{savingSalary ? '...' : '✓'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingSalary(false)} style={styles.salaryBtnCancel}>
                      <Text style={styles.salaryBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => { setEditingSalary(true); setBaseSalaryInput(baseSalary > 0 ? String(baseSalary) : '') }} style={styles.salaryValueRow}>
                    <Text style={styles.salaryBlockValue}>${baseSalary.toLocaleString('es-CL')}</Text>
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.divider} />

              {/* Comisiones */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Comisión por Unidades</Text>
                <Text style={styles.summaryValue}>${commUnidades.toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Comisión por Créditos</Text>
                <Text style={styles.summaryValue}>${Math.round(commCreditos).toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Comisión por Seguros</Text>
                <Text style={styles.summaryValue}>${commSeguros.toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Comisión VPP</Text>
                <Text style={styles.summaryValue}>${commVpp.toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Comisión MPP</Text>
                <Text style={styles.summaryValue}>${commMpp.toLocaleString('es-CL')}</Text>
              </View>

              <View style={styles.divider} />

              {/* Bonos */}
              <View style={styles.bonusHeader}>
                <Text style={styles.bonusSectionLabel}>Bonos</Text>
                <TouchableOpacity onPress={() => setShowBonusForm(v => !v)} style={styles.addBonusBtn}>
                  <Text style={styles.addBonusBtnText}>+ Agregar</Text>
                </TouchableOpacity>
              </View>

              {showBonusForm && (
                <View style={styles.bonusForm}>
                  <TextInput
                    style={styles.bonusInput}
                    value={bonusDesc}
                    onChangeText={setBonusDesc}
                    placeholder="Descripción del bono"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                  <View style={styles.bonusFormRow}>
                    <TextInput
                      style={[styles.bonusInput, { flex: 1 }]}
                      value={bonusAmount}
                      onChangeText={setBonusAmount}
                      placeholder="Monto"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={handleAddBonus} disabled={savingBonus} style={styles.salaryBtn}>
                      <Text style={styles.salaryBtnText}>{savingBonus ? '...' : '✓'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowBonusForm(false)} style={styles.salaryBtnCancel}>
                      <Text style={styles.salaryBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {bonuses.map(b => (
                <View key={b.id} style={styles.bonusRow}>
                  <Text style={styles.bonusDesc}>{b.description}</Text>
                  <View style={styles.bonusRight}>
                    <Text style={styles.summaryValue}>${b.amount.toLocaleString('es-CL')}</Text>
                    <TouchableOpacity onPress={() => handleDeleteBonus(b.id)} style={styles.deleteBonusBtn}>
                      <Text style={styles.deleteBonusText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {bonuses.length === 0 && !showBonusForm && (
                <Text style={styles.noBonusText}>Sin bonos este mes</Text>
              )}

              {/* Total */}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Sueldo Estimado</Text>
                <Text style={styles.totalValue}>${Math.round(grandTotal).toLocaleString('es-CL')}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32, paddingBottom: 16 },
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
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 13, color: Colors.white, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.accent },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: Colors.accent },
  salaryBlock: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 16, marginBottom: 16 },
  salaryBlockLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  salaryBlockValue: { fontSize: 26, fontWeight: 'bold', color: Colors.white },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 12 },
  salaryEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  salaryInput: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.5)', color: Colors.white, fontSize: 22, minWidth: 120, paddingVertical: 2, outlineStyle: 'none' } as any,
  salaryBtn: { backgroundColor: Colors.success, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  salaryBtnCancel: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  salaryBtnText: { color: Colors.white, fontSize: 13, fontWeight: 'bold' },
  salaryValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editIcon: { fontSize: 14 },
  bonusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bonusSectionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
  addBonusBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  addBonusBtnText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  bonusForm: { gap: 8, marginBottom: 8 },
  bonusFormRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  bonusInput: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.4)', color: Colors.white, fontSize: 13, paddingVertical: 4, marginBottom: 4, outlineStyle: 'none' } as any,
  bonusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  bonusDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', flex: 1 },
  bonusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBonusBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  deleteBonusText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  noBonusText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', paddingVertical: 6, fontStyle: 'italic' },
})
