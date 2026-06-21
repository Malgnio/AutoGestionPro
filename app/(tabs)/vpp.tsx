import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import PeriodSelector from '../../components/PeriodSelector'
import { validateRut, formatRut } from '../../lib/validateRut'

type VPP = {
  id: string
  client_name: string
  rut: string
  chassis: string
  ppu: string
  sale_month: string
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const COMMISSION_PER_VPP = 70000

export default function VPPScreen() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [vppList, setVppList] = useState<VPP[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [clientName, setClientName] = useState('')
  const [rut, setRut] = useState('')
  const [chassis, setChassis] = useState('')
  const [ppu, setPpu] = useState('')

  useEffect(() => { loadVpp() }, [selectedYear, selectedMonth])

  async function loadVpp() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('vpp').select('*')
      .eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end)
      .order('created_at', { ascending: true })
    setVppList(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setClientName(''); setRut(''); setChassis(''); setPpu(''); setError(''); setEditingId(null)
  }

  function openEdit(v: VPP) {
    setEditingId(v.id)
    setClientName(v.client_name); setRut(v.rut); setChassis(v.chassis ?? ''); setPpu(v.ppu)
    setError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!clientName || !rut || !ppu) { setError('Completa los campos obligatorios'); return }
    if (!validateRut(rut)) { setError('El RUT ingresado no es válido'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const formattedRut = formatRut(rut)
    const saleMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const payload = { client_name: clientName, rut: formattedRut, chassis, ppu, sale_month: saleMonth, user_id: user.id }

    if (editingId) {
      const { error: err } = await supabase.from('vpp').update(payload).eq('id', editingId)
      setSaving(false)
      if (err) { setError(err.message) } else { setShowForm(false); resetForm(); loadVpp() }
    } else {
      const { error: err } = await supabase.from('vpp').insert(payload)
      setSaving(false)
      if (err) { setError(err.message) } else { setShowForm(false); resetForm(); loadVpp() }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('vpp').delete().eq('id', id)
    loadVpp()
  }

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>VPP — {MONTHS[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowForm(true) }}>
            <Text style={styles.addButtonText}>+ Agregar VPP</Text>
          </TouchableOpacity>
        </View>

        <PeriodSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />

        {!loading && (
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: Colors.primary }]}>
              <Text style={styles.kpiLabel}>VPP del mes</Text>
              <Text style={styles.kpiValue}>{vppList.length}</Text>
              <Text style={styles.kpiSub}>vehículos en parte de pago</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiLabel, { color: Colors.textLight }]}>Comisión a pagar</Text>
              <Text style={[styles.kpiValue, { color: Colors.success, fontSize: 24 }]}>${(vppList.length * COMMISSION_PER_VPP).toLocaleString('es-CL')}</Text>
              <Text style={[styles.kpiSub, { color: Colors.textLight }]}>{vppList.length} × $70.000</Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView style={styles.tableContainer}>
            {vppList.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No hay VPP en {MONTHS[selectedMonth]} {selectedYear}</Text>
              </View>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.cell, styles.cellN, styles.headCell]}>N°</Text>
                  <Text style={[styles.cell, styles.cellName, styles.headCell]}>Nombre Cliente</Text>
                  <Text style={[styles.cell, styles.cellRut, styles.headCell]}>RUT</Text>
                  <Text style={[styles.cell, styles.cellChassis, styles.headCell]}>Chasis</Text>
                  <Text style={[styles.cell, styles.cellPpu, styles.headCell]}>PPU</Text>
                  <Text style={[styles.cell, styles.cellAction, styles.headCell]}></Text>
                </View>
                {vppList.map((item, index) => (
                  <View key={item.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.cell, styles.cellN]}>{index + 1}</Text>
                    <Text style={[styles.cell, styles.cellName]}>{item.client_name}</Text>
                    <Text style={[styles.cell, styles.cellRut]}>{item.rut}</Text>
                    <Text style={[styles.cell, styles.cellChassis, { color: Colors.textLight }]}>{item.chassis || '—'}</Text>
                    <Text style={[styles.cell, styles.cellPpu, { fontWeight: '600' }]}>{item.ppu}</Text>
                    <View style={[styles.cell, styles.cellAction]}>
                      <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                        <Text>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                        <Text>🗑️</Text>
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
            <Text style={styles.drawerTitle}>{editingId ? 'Editar VPP' : 'Nuevo VPP'}</Text>
            <Text style={styles.drawerSub}>{MONTHS[selectedMonth]} {selectedYear}</Text>
          </View>
          <TouchableOpacity onPress={() => { setShowForm(false); resetForm() }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.formError}>{error}</Text> : null}

          <Text style={styles.label}>Nombre Cliente *</Text>
          <TextInput
            style={styles.input} value={clientName}
            onChangeText={v => setClientName(v.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase()))}
            placeholder="Nombre Apellido" placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>RUT *</Text>
          <TextInput
            style={[styles.input, rut.length > 3 && !validateRut(rut) && styles.inputError]}
            value={rut} onChangeText={v => setRut(formatRut(v))}
            placeholder="12.345.678-9" placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
          />
          {rut.length > 3 && !validateRut(rut) && <Text style={styles.fieldError}>RUT inválido</Text>}

          <Text style={styles.label}>Chasis</Text>
          <TextInput
            style={styles.input} value={chassis}
            onChangeText={v => setChassis(v.toUpperCase())}
            placeholder="Número de chasis" placeholderTextColor={Colors.textLight}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>PPU *</Text>
          <TextInput
            style={styles.input} value={ppu}
            onChangeText={v => setPpu(v.toUpperCase())}
            placeholder="ABCD-12" placeholderTextColor={Colors.textLight}
            autoCapitalize="characters"
          />
        </ScrollView>

        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowForm(false); resetForm() }}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>{editingId ? 'Guardar cambios' : 'Guardar VPP'}</Text>}
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
  cellN: { width: 40 },
  cellName: { flex: 2 },
  cellRut: { flex: 1.2 },
  cellChassis: { flex: 2 },
  cellPpu: { flex: 1 },
  cellAction: { width: 72, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: '#F0F3F6' },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: Colors.textLight, fontSize: 15 },
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 100 },
  drawer: {
    position: 'fixed' as any, top: 0, right: 0, bottom: 0,
    width: 460, backgroundColor: Colors.white,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    zIndex: 101, transform: [{ translateX: 460 }],
    transition: 'transform 0.3s ease',
  } as any,
  drawerOpen: { transform: [{ translateX: 0 }] },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.border },
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
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelButtonText: { color: Colors.textLight, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: Colors.white, fontWeight: 'bold' },
})
