import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import PeriodSelector from '../../components/PeriodSelector'
import { validateRut, formatRut } from '../../lib/validateRut'

type Sale = {
  id: string
  customer_name: string
  rut: string
  model: string
  chassis: string
  odv: string
  purchase_type: 'R' | 'F' | 'FL' | 'SEG'
  sale_month: string
}

const PURCHASE_TYPES = ['R', 'F', 'FL', 'SEG'] as const
const PURCHASE_TYPE_LABEL: Record<string, string> = { R: 'Retail', F: 'Flota', FL: 'Fleet', SEG: 'Seguro' }
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function SalesScreen() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [rut, setRut] = useState('')
  const [model, setModel] = useState('')
  const [chassis, setChassis] = useState('')
  const [odv, setOdv] = useState('')
  const [purchaseType, setPurchaseType] = useState<'R' | 'F' | 'FL' | 'SEG'>('R')

  useEffect(() => { loadSales() }, [selectedYear, selectedMonth])

  async function loadSales() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('sales').select('*').eq('user_id', user.id)
      .gte('sale_month', start).lte('sale_month', end)
      .order('created_at', { ascending: true })

    setSales(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setCustomerName(''); setRut(''); setModel(''); setChassis(''); setOdv(''); setPurchaseType('R'); setError(''); setEditingId(null)
  }

  function openEdit(item: Sale) {
    setEditingId(item.id)
    setCustomerName(item.customer_name)
    setRut(item.rut)
    setModel(item.model)
    setChassis(item.chassis)
    setOdv(item.odv)
    setPurchaseType(item.purchase_type)
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!customerName || !rut || !model || !chassis || !odv) {
      setError('Completa todos los campos')
      return
    }
    if (!validateRut(rut)) {
      setError('El RUT ingresado no es válido')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const formattedRut = formatRut(rut)

    if (editingId) {
      const { error } = await supabase.from('sales').update({
        customer_name: customerName, rut: formattedRut, model, chassis, odv, purchase_type: purchaseType,
      }).eq('id', editingId)
      setSaving(false)
      if (error) { setError(error.message) } else { setShowForm(false); resetForm(); loadSales() }
    } else {
      const saleMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
      const { error } = await supabase.from('sales').insert({
        user_id: user.id, customer_name: customerName, rut: formattedRut, model, chassis, odv,
        purchase_type: purchaseType, sale_month: saleMonth,
      })
      setSaving(false)
      if (error) { setError(error.message) } else { setShowForm(false); resetForm(); loadSales() }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta venta?')) return
    await supabase.from('sales').delete().eq('id', id)
    loadSales()
  }

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Ventas — {MONTHS[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowForm(true) }}>
            <Text style={styles.addButtonText}>+ Nueva venta</Text>
          </TouchableOpacity>
        </View>

        <PeriodSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView style={styles.tableContainer}>
            {sales.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No hay ventas en {MONTHS[selectedMonth]} {selectedYear}</Text>
              </View>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.cell, styles.cellN, styles.headCell]}>#</Text>
                  <Text style={[styles.cell, styles.cellName, styles.headCell]}>Cliente</Text>
                  <Text style={[styles.cell, styles.cellRut, styles.headCell]}>RUT</Text>
                  <Text style={[styles.cell, styles.cellModel, styles.headCell]}>Modelo</Text>
                  <Text style={[styles.cell, styles.cellChassis, styles.headCell]}>Chasis</Text>
                  <Text style={[styles.cell, styles.cellOdv, styles.headCell]}>OdV</Text>
                  <Text style={[styles.cell, styles.cellType, styles.headCell]}>Tipo</Text>
                  <Text style={[styles.cell, styles.cellAction, styles.headCell]}></Text>
                </View>
                {sales.map((item, index) => (
                  <View key={item.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.cell, styles.cellN]}>{index + 1}</Text>
                    <Text style={[styles.cell, styles.cellName]}>{item.customer_name}</Text>
                    <Text style={[styles.cell, styles.cellRut]}>{item.rut}</Text>
                    <Text style={[styles.cell, styles.cellModel]} numberOfLines={1}>{item.model}</Text>
                    <Text style={[styles.cell, styles.cellChassis]}>{item.chassis}</Text>
                    <Text style={[styles.cell, styles.cellOdv]}>{item.odv}</Text>
                    <View style={[styles.cell, styles.cellType]}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{PURCHASE_TYPE_LABEL[item.purchase_type]}</Text>
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
            <Text style={styles.drawerTitle}>{editingId ? 'Editar venta' : 'Nueva venta'}</Text>
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

          <Text style={styles.label}>Modelo</Text>
          <TextInput style={styles.input} value={model} onChangeText={setModel} placeholderTextColor={Colors.textLight} placeholder="Ej: Grand i10" />

          <Text style={styles.label}>Chasis</Text>
          <TextInput style={styles.input} value={chassis} onChangeText={setChassis} placeholderTextColor={Colors.textLight} placeholder="Número de chasis" autoCapitalize="characters" />

          <Text style={styles.label}>OdV</Text>
          <TextInput style={styles.input} value={odv} onChangeText={setOdv} placeholderTextColor={Colors.textLight} placeholder="Orden de venta" />

          <Text style={styles.label}>Tipo de compra</Text>
          <View style={styles.typeRow}>
            {PURCHASE_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, purchaseType === type && styles.typeBtnActive]}
                onPress={() => setPurchaseType(type)}
              >
                <Text style={[styles.typeBtnText, purchaseType === type && styles.typeBtnTextActive]}>
                  {PURCHASE_TYPE_LABEL[type]}
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
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>{editingId ? 'Guardar cambios' : 'Guardar venta'}</Text>}
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
  tableContainer: { flex: 1, paddingHorizontal: 32, paddingTop: 20 },
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
  cellModel: { flex: 2.2 },
  cellChassis: { flex: 2 },
  cellOdv: { flex: 1 },
  cellType: { width: 70 },
  cellAction: { width: 72, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  badge: { backgroundColor: Colors.secondary, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
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
