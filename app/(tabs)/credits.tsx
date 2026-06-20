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
  credit_type: 'CI' | 'CC'
  sale_month: string
}

const CREDIT_TYPES = ['CI', 'CC'] as const
const CREDIT_TYPE_LABEL: Record<string, string> = { CI: 'Crédito Interno', CC: 'Crédito Externo' }
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function CreditsScreen() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [credits, setCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [rut, setRut] = useState('')
  const [dealerCost, setDealerCost] = useState('')
  const [creditType, setCreditType] = useState<'CI' | 'CC'>('CI')

  useEffect(() => { loadCredits() }, [selectedYear, selectedMonth])

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

  function resetForm() {
    setCustomerName(''); setRut(''); setDealerCost(''); setCreditType('CI'); setError(''); setEditingId(null)
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

        {credits.length > 0 && (
          <View style={styles.totalBanner}>
            <Text style={styles.totalLabel}>Total C. Dealer — {MONTHS[selectedMonth]} {selectedYear}</Text>
            <Text style={styles.totalValue}>${total.toLocaleString('es-CL')}</Text>
          </View>
        )}

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
                      <View style={[styles.badge, item.credit_type === 'CI' ? styles.badgeCI : styles.badgeCC]}>
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

        <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.formError}>{error}</Text> : null}

          <Text style={styles.label}>Nombre cliente</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={v => setCustomerName(v.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase()))}
            placeholderTextColor={Colors.textLight}
            placeholder="Nombre completo"
          />

          <Text style={styles.label}>RUT</Text>
          <TextInput
            style={[styles.input, rut.length > 3 && !validateRut(rut) && styles.inputError]}
            value={rut}
            onChangeText={setRut}
            placeholderTextColor={Colors.textLight}
            placeholder="12.345.678-9"
          />
          {rut.length > 3 && !validateRut(rut) && (
            <Text style={styles.fieldError}>RUT inválido</Text>
          )}

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
  totalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.success, marginHorizontal: 32, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 12 },
  totalLabel: { color: Colors.white, fontSize: 14 },
  totalValue: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  tableContainer: { flex: 1, paddingHorizontal: 32, paddingTop: 20 },
  table: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  tableHead: { backgroundColor: Colors.primary },
  rowEven: { backgroundColor: Colors.white },
  rowOdd: { backgroundColor: '#F8F9FA' },
  cell: { fontSize: 14, color: Colors.text, paddingHorizontal: 8 },
  headCell: { color: Colors.white, fontWeight: 'bold', fontSize: 13 },
  cellN: { width: 40 },
  cellName: { flex: 2 },
  cellRut: { flex: 1.2 },
  cellCost: { flex: 1.2 },
  cellType: { width: 90 },
  cellAction: { width: 90, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
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
  inputError: { borderColor: Colors.danger },
  fieldError: { fontSize: 12, color: Colors.danger, marginTop: 4 },
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
