import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import PeriodSelector from '../../components/PeriodSelector'
import { validateRut, formatRut } from '../../lib/validateRut'

type Credit = {
  id: string
  customer_name: string
  rut: string
  dealer_cost: number
  credit_type: 'OI' | 'CC'
  sale_month: string
}

type SaleOption = {
  customer_name: string
  rut: string
}

const CREDIT_COMMISSION = [
  { min: 9, max: Infinity, rate: 0.17 },
  { min: 8, max: 8, rate: 0.16 },
  { min: 6, max: 7, rate: 0.12 },
  { min: 3, max: 5, rate: 0.10 },
  { min: 2, max: 2, rate: 0.05 },
  { min: 1, max: 1, rate: 0.04 },
]

function getCreditRate(count: number) {
  return CREDIT_COMMISSION.find(r => count >= r.min && count <= r.max)?.rate ?? 0
}

const CREDIT_TYPES = ['OI', 'CC'] as const
const CREDIT_TYPE_LABEL: Record<string, string> = { OI: 'Crédito Inteligente', CC: 'Crédito Convencional' }
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function CreditsScreen() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [credits, setCredits] = useState<Credit[]>([])
  const [salesOptions, setSalesOptions] = useState<SaleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [rut, setRut] = useState('')
  const [dealerCost, setDealerCost] = useState('')
  const [creditType, setCreditType] = useState<'OI' | 'CC'>('OI')


  useEffect(() => { loadCredits() }, [selectedYear, selectedMonth])
  useEffect(() => { loadSalesOptions() }, [selectedYear, selectedMonth])

  async function loadCredits() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('credits').select('*').eq('user_id', user.id)
      .gte('sale_month', start).lte('sale_month', end)
      .order('created_at', { ascending: true })

    setCredits(data ?? [])
    setLoading(false)
  }

  async function loadSalesOptions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('sales').select('customer_name, rut').eq('user_id', user.id)
      .gte('sale_month', start).lte('sale_month', end)
      .order('created_at', { ascending: true })

    setSalesOptions(data ?? [])
  }

  function resetForm() {
    setCustomerName(''); setRut(''); setDealerCost(''); setCreditType('OI'); setError(''); setEditingId(null); setShowDropdown(false)
  }

  function selectSale(sale: SaleOption) {
    setCustomerName(sale.customer_name)
    setRut(sale.rut)
    setShowDropdown(false)
  }

  function openEdit(item: Credit) {
    setEditingId(item.id)
    setCustomerName(item.customer_name)
    setRut(item.rut)
    setDealerCost(String(item.dealer_cost))
    setCreditType(item.credit_type)
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!customerName || !rut || !dealerCost) {
      setError('Completa todos los campos')
      return
    }
    if (!validateRut(rut)) {
      setError('El RUT ingresado no es válido')
      return
    }
    const cost = parseInt(dealerCost.replace(/\./g, '').replace(/,/g, ''))
    if (isNaN(cost) || cost <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const formattedRut = formatRut(rut)

    if (editingId) {
      const { error } = await supabase.from('credits').update({
        customer_name: customerName, rut: formattedRut, dealer_cost: cost, credit_type: creditType,
      }).eq('id', editingId)
      setSaving(false)
      if (error) { setError(error.message) } else { setShowForm(false); resetForm(); loadCredits() }
    } else {
      const saleMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
      const { error } = await supabase.from('credits').insert({
        user_id: user.id, customer_name: customerName, rut: formattedRut,
        dealer_cost: cost, credit_type: creditType, sale_month: saleMonth,
      })
      setSaving(false)
      if (error) { setError(error.message) } else { setShowForm(false); resetForm(); loadCredits() }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este crédito?')) return
    await supabase.from('credits').delete().eq('id', id)
    loadCredits()
  }

  const total = credits.reduce((sum, c) => sum + Number(c.dealer_cost), 0)

  // Filtrar opciones según lo que se escribe
  const filteredOptions = salesOptions.filter(s =>
    s.customer_name.toLowerCase().includes(customerName.toLowerCase())
  )

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Créditos — {MONTHS[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowForm(true) }}>
            <Text style={styles.addButtonText}>+ Nuevo crédito</Text>
          </TouchableOpacity>
        </View>

        <PeriodSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />

        {!loading && (() => {
          const rate = getCreditRate(credits.length)
          const sinIva = total / 1.19
          const comision = sinIva * rate
          return (
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, styles.kpiHighlight]}>
                <Text style={styles.kpiLabel}>Créditos</Text>
                <Text style={styles.kpiValue}>{credits.length}</Text>
                <Text style={styles.kpiSub}>Tasa: {(rate * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiLabel, { color: Colors.textLight }]}>Total C. Dealer</Text>
                <Text style={[styles.kpiValue, { color: Colors.text, fontSize: 20 }]}>${total.toLocaleString('es-CL')}</Text>
                <Text style={[styles.kpiSub, { color: Colors.textLight }]}>Sin IVA: ${Math.round(sinIva).toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiLabel, { color: Colors.textLight }]}>Comisión a pagar</Text>
                <Text style={[styles.kpiValue, { color: Colors.success, fontSize: 20 }]}>${Math.round(comision).toLocaleString('es-CL')}</Text>
                <Text style={[styles.kpiSub, { color: Colors.textLight }]}>Sin IVA × {(rate * 100).toFixed(0)}%</Text>
              </View>
            </View>
          )
        })()}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView style={styles.tableContainer}>
            {credits.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No hay créditos en {MONTHS[selectedMonth]} {selectedYear}</Text>
              </View>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.cell, styles.cellN, styles.headCell]}>#</Text>
                  <Text style={[styles.cell, styles.cellName, styles.headCell]}>Cliente</Text>
                  <Text style={[styles.cell, styles.cellRut, styles.headCell]}>RUT</Text>
                  <Text style={[styles.cell, styles.cellCost, styles.headCell]}>C. Dealer</Text>
                  <Text style={[styles.cell, styles.cellType, styles.headCell]}>Tipo</Text>
                  <Text style={[styles.cell, styles.cellAction, styles.headCell]}></Text>
                </View>
                {credits.map((item, index) => (
                  <View key={item.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.cell, styles.cellN]}>{index + 1}</Text>
                    <Text style={[styles.cell, styles.cellName]}>{item.customer_name}</Text>
                    <Text style={[styles.cell, styles.cellRut]}>{item.rut}</Text>
                    <Text style={[styles.cell, styles.cellCost]}>${Number(item.dealer_cost).toLocaleString('es-CL')}</Text>
                    <View style={[styles.cell, styles.cellType]}>
                      <View style={[styles.badge, item.credit_type === 'OI' ? styles.badgeCI : styles.badgeCC]}>
                        <Text style={styles.badgeText}>{item.credit_type}</Text>
                      </View>
                    </View>
                    <View style={[styles.cell, styles.cellAction]}>
                      <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                        <Text style={styles.iconEdit}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                        <Text style={styles.iconDelete}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {showForm && <View style={styles.overlay} />}

      <View style={[styles.drawer, showForm && styles.drawerOpen]}>
        <View style={styles.drawerHeader}>
          <View>
            <Text style={styles.drawerTitle}>{editingId ? 'Editar crédito' : 'Nuevo crédito'}</Text>
            <Text style={styles.drawerSub}>{MONTHS[selectedMonth]} {selectedYear}</Text>
          </View>
          <TouchableOpacity onPress={() => { setShowForm(false); resetForm() }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.formError}>{error}</Text> : null}

          <Text style={styles.label}>Nombre cliente</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={v => { setCustomerName(v); setShowDropdown(true); setRut('') }}
            onFocus={() => setShowDropdown(true)}
            placeholderTextColor={Colors.textLight}
            placeholder="Buscar cliente del mes..."
          />
          {showDropdown && filteredOptions.length > 0 && (
            <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filteredOptions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dropdownItem, i === filteredOptions.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => selectSale(s)}
                >
                  <Text style={styles.dropdownName}>{s.customer_name}</Text>
                  <Text style={styles.dropdownRut}>{s.rut}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>RUT</Text>
          <TextInput
            style={[styles.input, styles.inputReadonly]}
            value={rut}
            editable={false}
            placeholderTextColor={Colors.textLight}
            placeholder="Se autocompleta al elegir cliente"
          />

          <Text style={styles.label}>C. Dealer (monto)</Text>
          <TextInput style={styles.input} value={dealerCost} onChangeText={setDealerCost} keyboardType="numeric" placeholderTextColor={Colors.textLight} placeholder="Ej: 1500000" />

          <Text style={styles.label}>Tipo de crédito</Text>
          <View style={styles.typeRow}>
            {CREDIT_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, creditType === type && styles.typeBtnActive]}
                onPress={() => setCreditType(type)}
              >
                <Text style={[styles.typeBtnText, creditType === type && styles.typeBtnTextActive]}>
                  {CREDIT_TYPE_LABEL[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowForm(false); resetForm() }}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>{editingId ? 'Guardar cambios' : 'Guardar crédito'}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: Colors.background, overflow: 'hidden' },
  main: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  kpiRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 32, paddingTop: 4, paddingBottom: 4 },
  kpiCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: Colors.border },
  kpiHighlight: { backgroundColor: Colors.success, borderColor: Colors.success },
  kpiLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  kpiValue: { fontSize: 28, fontWeight: 'bold', color: Colors.white, marginBottom: 2 },
  kpiSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  tableContainer: { flex: 1, paddingHorizontal: 32, paddingTop: 12 },
  table: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  tableHead: { backgroundColor: Colors.primary },
  rowEven: { backgroundColor: Colors.white },
  rowOdd: { backgroundColor: '#F8F9FA' },
  cell: { fontSize: 13, color: Colors.text, paddingHorizontal: 6 },
  headCell: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  cellN: { width: 32 },
  cellName: { flex: 2 },
  cellRut: { flex: 1.2 },
  cellCost: { flex: 1.2 },
  cellType: { width: 90 },
  cellAction: { width: 72, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeCI: { backgroundColor: Colors.secondary },
  badgeCC: { backgroundColor: Colors.accent },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: '#F0F3F6' },
  iconEdit: { fontSize: 14 },
  iconDelete: { fontSize: 14 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: Colors.textLight, fontSize: 15 },
  overlay: {
    position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 100,
  },
  drawer: {
    position: 'fixed' as any, top: 0, right: 0, bottom: 0,
    width: 460, backgroundColor: Colors.white,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    zIndex: 101, transform: [{ translateX: 460 }],
    transition: 'transform 0.3s ease',
  } as any,
  drawerOpen: { transform: [{ translateX: 0 }] },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  drawerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  drawerSub: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  closeBtn: { fontSize: 18, color: Colors.textLight, padding: 4 },
  drawerBody: { flex: 1, padding: 24 },
  drawerFooter: { flexDirection: 'row', gap: 12, padding: 24, borderTopWidth: 1, borderTopColor: Colors.border },
  formError: { backgroundColor: '#FDECEA', color: Colors.danger, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  label: { fontSize: 13, color: Colors.textLight, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: Colors.text, outlineStyle: 'none' } as any,
  inputReadonly: { backgroundColor: '#F8F9FA', color: Colors.textLight },
  dropdown: {
    backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, maxHeight: 200, marginTop: 4,
  },
  dropdownItem: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  dropdownName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  dropdownRut: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { color: Colors.textLight, fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: Colors.white },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelButtonText: { color: Colors.textLight, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: Colors.white, fontWeight: 'bold' },
})
