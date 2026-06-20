import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

type Sale = {
  id: string
  customer_name: string
  rut: string
  model: string
  chassis: string
  odv: string
  purchase_type: 'R' | 'F' | 'FL'
  sale_month: string
}

const PURCHASE_TYPES = ['R', 'F', 'FL'] as const
const PURCHASE_TYPE_LABEL: Record<string, string> = { R: 'Retail', F: 'Flota', FL: 'Fleet' }

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [rut, setRut] = useState('')
  const [model, setModel] = useState('')
  const [chassis, setChassis] = useState('')
  const [odv, setOdv] = useState('')
  const [purchaseType, setPurchaseType] = useState<'R' | 'F' | 'FL'>('R')

  useEffect(() => { loadSales() }, [])

  async function loadSales() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('sales').select('*').eq('user_id', user.id)
      .gte('sale_month', start).lte('sale_month', end)
      .order('created_at', { ascending: false })

    setSales(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setCustomerName(''); setRut(''); setModel(''); setChassis(''); setOdv(''); setPurchaseType('R'); setError('')
  }

  async function handleSave() {
    if (!customerName || !rut || !model || !chassis || !odv) {
      setError('Completa todos los campos')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const saleMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    const { error } = await supabase.from('sales').insert({
      user_id: user.id, customer_name: customerName, rut, model, chassis, odv,
      purchase_type: purchaseType, sale_month: saleMonth,
    })

    setSaving(false)
    if (error) { setError(error.message) } else { setShowForm(false); resetForm(); loadSales() }
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
          <Text style={styles.pageTitle}>Ventas del mes</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
            <Text style={styles.addButtonText}>+ Nueva venta</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView style={styles.tableContainer}>
            {sales.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No hay ventas registradas este mes</Text>
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
                    <Text style={[styles.cell, styles.cellModel]}>{item.model}</Text>
                    <Text style={[styles.cell, styles.cellChassis]}>{item.chassis}</Text>
                    <Text style={[styles.cell, styles.cellOdv]}>{item.odv}</Text>
                    <View style={[styles.cell, styles.cellType]}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{PURCHASE_TYPE_LABEL[item.purchase_type]}</Text>
                      </View>
                    </View>
                    <View style={[styles.cell, styles.cellAction]}>
                      <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Text style={styles.deleteBtn}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Overlay oscuro */}
      {showForm && (
        <TouchableOpacity style={styles.overlay} onPress={() => { setShowForm(false); resetForm() }} activeOpacity={1} />
      )}

      {/* Panel lateral derecho */}
      <View style={[styles.drawer, showForm && styles.drawerOpen]}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Nueva venta</Text>
          <TouchableOpacity onPress={() => { setShowForm(false); resetForm() }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.formError}>{error}</Text> : null}

          <Text style={styles.label}>Nombre cliente</Text>
          <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholderTextColor={Colors.textLight} placeholder="Nombre completo" />

          <Text style={styles.label}>RUT</Text>
          <TextInput style={styles.input} value={rut} onChangeText={setRut} placeholderTextColor={Colors.textLight} placeholder="12.345.678-9" />

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
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>Guardar venta</Text>}
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
  tableContainer: { flex: 1, paddingHorizontal: 32 },
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
  cellModel: { flex: 1.5 },
  cellChassis: { flex: 2 },
  cellOdv: { flex: 1.2 },
  cellType: { width: 80 },
  cellAction: { width: 80, alignItems: 'flex-end' },
  badge: { backgroundColor: Colors.secondary, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  deleteBtn: { color: Colors.danger, fontSize: 13 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: Colors.textLight, fontSize: 15 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: 400,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 20,
    transform: [{ translateX: 400 }],
    transition: 'transform 0.3s ease',
  } as any,
  drawerOpen: {
    transform: [{ translateX: 0 }],
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  drawerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textLight, padding: 4 },
  drawerBody: { flex: 1, padding: 24 },
  drawerFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  formError: { backgroundColor: '#FDECEA', color: Colors.danger, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  label: { fontSize: 13, color: Colors.textLight, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: Colors.text, outlineStyle: 'none' } as any,
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
