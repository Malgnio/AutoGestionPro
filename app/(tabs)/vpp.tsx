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

  function openNew() {
    setEditingId(null)
    setClientName(''); setRut(''); setChassis(''); setPpu('')
    setError(''); setShowForm(true)
  }

  function openEdit(v: VPP) {
    setEditingId(v.id)
    setClientName(v.client_name); setRut(v.rut); setChassis(v.chassis ?? ''); setPpu(v.ppu)
    setError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!clientName || !rut || !ppu) { setError('Completa los campos obligatorios'); return }
    if (!validateRut(rut)) { setError('RUT inválido'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const saleMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const payload = { client_name: clientName, rut, chassis, ppu, sale_month: saleMonth, user_id: user.id }

    if (editingId) {
      await supabase.from('vpp').update(payload).eq('id', editingId)
    } else {
      await supabase.from('vpp').insert(payload)
    }
    setSaving(false); setShowForm(false); loadVpp()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('vpp').delete().eq('id', id)
    setVppList(prev => prev.filter(v => v.id !== id))
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>VPP</Text>
          <Text style={styles.pageSub}>Vehículo en Parte de Pago</Text>
        </View>
        <View style={styles.headerRight}>
          <PeriodSelector
            selectedYear={selectedYear} selectedMonth={selectedMonth}
            onYearChange={setSelectedYear} onMonthChange={setSelectedMonth}
          />
          <TouchableOpacity style={styles.addButton} onPress={openNew}>
            <Text style={styles.addButtonText}>+ Agregar VPP</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: Colors.primary }]}>
          <Text style={styles.kpiLabel}>VPP del mes</Text>
          <Text style={[styles.kpiValue, { color: Colors.primary }]}>{vppList.length}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cell, styles.cellNum, styles.headCell]}>N°</Text>
              <Text style={[styles.cell, styles.cellName, styles.headCell]}>Nombre Cliente</Text>
              <Text style={[styles.cell, styles.cellRut, styles.headCell]}>RUT</Text>
              <Text style={[styles.cell, styles.cellChassis, styles.headCell]}>Chasis</Text>
              <Text style={[styles.cell, styles.cellPpu, styles.headCell]}>PPU</Text>
              <Text style={[styles.cell, styles.cellAction, styles.headCell]}></Text>
            </View>
            {vppList.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No hay registros para este período</Text>
              </View>
            ) : vppList.map((v, i) => (
              <TouchableOpacity key={v.id} onPress={() => openEdit(v)}
                style={[styles.tableRow, i % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                <Text style={[styles.cell, styles.cellNum]}>{i + 1}</Text>
                <Text style={[styles.cell, styles.cellName]}>{v.client_name}</Text>
                <Text style={[styles.cell, styles.cellRut, { color: Colors.textLight }]}>{v.rut}</Text>
                <Text style={[styles.cell, styles.cellChassis, { color: Colors.textLight }]}>{v.chassis || '—'}</Text>
                <Text style={[styles.cell, styles.cellPpu, { fontWeight: '600' }]}>{v.ppu}</Text>
                <View style={[styles.cell, styles.cellAction]}>
                  <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); handleDelete(v.id) }} style={styles.iconBtn}>
                    <Text style={styles.iconDelete}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {showForm && <View style={styles.overlay} />}

      <View style={[styles.drawer, showForm && styles.drawerOpen]}>
        <View style={styles.drawerHeader}>
          <View>
            <Text style={styles.drawerTitle}>{editingId ? 'Editar VPP' : 'Nuevo VPP'}</Text>
            <Text style={styles.drawerSub}>Vehículo en Parte de Pago</Text>
          </View>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerBody}>
          {error ? <Text style={styles.formError}>{error}</Text> : null}

          <Text style={styles.label}>Nombre Cliente *</Text>
          <TextInput
            style={styles.input} value={clientName}
            onChangeText={v => setClientName(v.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase()))}
            placeholder="Nombre Apellido" placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>RUT *</Text>
          <TextInput
            style={styles.input} value={rut}
            onChangeText={v => setRut(formatRut(v))}
            placeholder="12345678-9" placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
          />

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
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>Guardar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  pageSub: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 32, paddingBottom: 20, gap: 16 },
  kpiCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 20, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, minWidth: 160 },
  kpiLabel: { fontSize: 12, color: Colors.textLight, marginBottom: 6, textTransform: 'uppercase' },
  kpiValue: { fontSize: 28, fontWeight: 'bold' },
  tableContainer: { flex: 1, paddingHorizontal: 32 },
  table: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  tableHead: { backgroundColor: Colors.primary },
  rowEven: { backgroundColor: Colors.white },
  rowOdd: { backgroundColor: '#F8F9FA' },
  cell: { fontSize: 13, color: Colors.text, paddingHorizontal: 6 },
  headCell: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  cellNum: { width: 40 },
  cellName: { flex: 2 },
  cellRut: { flex: 1 },
  cellChassis: { flex: 1.5 },
  cellPpu: { flex: 1 },
  cellAction: { width: 48, alignItems: 'flex-end' },
  emptyRow: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textLight, fontSize: 14 },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: '#F0F3F6' },
  iconDelete: { fontSize: 14 },
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
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelButtonText: { color: Colors.textLight, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: Colors.white, fontWeight: 'bold' },
})
