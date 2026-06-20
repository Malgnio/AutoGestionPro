import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

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

export default function CreditsScreen() {
  const [credits, setCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [rut, setRut] = useState('')
  const [dealerCost, setDealerCost] = useState('')
  const [creditType, setCreditType] = useState<'CI' | 'CC'>('CI')

  useEffect(() => { loadCredits() }, [])

  async function loadCredits() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('credits').select('*').eq('user_id', user.id)
      .gte('sale_month', start).lte('sale_month', end)
      .order('created_at', { ascending: false })

    setCredits(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setCustomerName(''); setRut(''); setDealerCost(''); setCreditType('CI'); setError('')
  }

  async function handleSave() {
    if (!customerName || !rut || !dealerCost) {
      setError('Completa todos los campos')
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

    const now = new Date()
    const saleMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    const { error } = await supabase.from('credits').insert({
      user_id: user.id, customer_name: customerName, rut,
      dealer_cost: cost, credit_type: creditType, sale_month: saleMonth,
    })

    setSaving(false)
    if (error) { setError(error.message) } else { setShowForm(false); resetForm(); loadCredits() }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este crédito?')) return
    await supabase.from('credits').delete().eq('id', id)
    loadCredits()
  }

  const total = credits.reduce((sum, c) => sum + Number(c.dealer_cost), 0)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Créditos del mes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Text style={styles.addButtonText}>+ Nuevo crédito</Text>
        </TouchableOpacity>
      </View>

      {credits.length > 0 && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total C. Dealer del mes</Text>
          <Text style={styles.totalValue}>${total.toLocaleString('es-CL')}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={styles.tableContainer}>
          {credits.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay créditos registrados este mes</Text>
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

      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nuevo crédito</Text>

            {error ? <Text style={styles.formError}>{error}</Text> : null}

            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <Text style={styles.label}>Nombre cliente</Text>
                <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholderTextColor={Colors.textLight} />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>RUT</Text>
                <TextInput style={styles.input} value={rut} onChangeText={setRut} placeholderTextColor={Colors.textLight} />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>C. Dealer (monto)</Text>
                <TextInput style={styles.input} value={dealerCost} onChangeText={setDealerCost} keyboardType="numeric" placeholderTextColor={Colors.textLight} />
              </View>
              <View style={styles.formField}>
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
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowForm(false); resetForm() }}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  totalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.success, marginHorizontal: 32, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 12 },
  totalLabel: { color: Colors.white, fontSize: 14 },
  totalValue: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
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
  cellCost: { flex: 1.2 },
  cellType: { width: 90 },
  cellAction: { width: 80, alignItems: 'flex-end' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeCI: { backgroundColor: Colors.secondary },
  badgeCC: { backgroundColor: Colors.accent },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  deleteBtn: { color: Colors.danger, fontSize: 13 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: Colors.textLight, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  formCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 36, width: 500, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 24 },
  formError: { backgroundColor: '#FDECEA', color: Colors.danger, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  formField: { width: '47%' },
  label: { fontSize: 13, color: Colors.textLight, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: Colors.text, outlineStyle: 'none' } as any,
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 9, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { color: Colors.textLight, fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: Colors.white },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  cancelButtonText: { color: Colors.textLight, fontWeight: '600' },
  saveButton: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  saveButtonText: { color: Colors.white, fontWeight: 'bold' },
})
