import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import PeriodSelector from '../../components/PeriodSelector'
import { usePeriod } from '../../contexts/PeriodContext'
import ClientSearch from '../../components/ClientSearch'
import AlertBell from '../../components/AlertBell'
import { validateRut, formatRut } from '../../lib/validateRut'

type MPP = {
  id: string
  client_name: string
  rut: string
  chassis: string
  product_type: 'Platinium' | 'Diamond' | 'Zafiro'
  sale_month: string
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const PRODUCT_TYPES = ['Platinium', 'Diamond', 'Zafiro'] as const
const COMMISSION: Record<string, number> = { Platinium: 16000, Diamond: 21000, Zafiro: 26000 }
const TYPE_COLOR: Record<string, string> = { Platinium: '#7F8C8D', Diamond: '#2471A3', Zafiro: '#8E44AD' }

export default function MPPScreen() {
  const { selectedYear, selectedMonth, setSelectedYear, setSelectedMonth } = usePeriod()
  const [mppList, setMppList] = useState<MPP[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [clientName, setClientName] = useState('')
  const [rut, setRut] = useState('')
  const [chassis, setChassis] = useState('')
  const [productType, setProductType] = useState<'Platinium' | 'Diamond' | 'Zafiro'>('Diamond')
  const [manualMode, setManualMode] = useState(false)

  useEffect(() => { loadMpp() }, [selectedYear, selectedMonth])

  async function loadMpp() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('mpp').select('*')
      .eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end)
      .order('created_at', { ascending: true })
    setMppList(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setClientName(''); setRut(''); setChassis(''); setProductType('Diamond'); setError(''); setEditingId(null); setManualMode(false)
  }

  function openEdit(v: MPP) {
    setEditingId(v.id)
    setClientName(v.client_name); setRut(v.rut); setChassis(v.chassis ?? ''); setProductType(v.product_type)
    setManualMode(false); setError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!clientName || !rut) { setError('Completa los campos obligatorios'); return }
    if (!validateRut(rut)) { setError('El RUT ingresado no es válido'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const formattedRut = formatRut(rut)
    const saleMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const payload = { client_name: clientName, rut: formattedRut, chassis, product_type: productType, sale_month: saleMonth, user_id: user.id }

    if (editingId) {
      const { error: err } = await supabase.from('mpp').update(payload).eq('id', editingId)
      setSaving(false)
      if (err) { setError(err.message) } else { setShowForm(false); resetForm(); loadMpp() }
    } else {
      const { error: err } = await supabase.from('mpp').insert(payload)
      setSaving(false)
      if (err) { setError(err.message) } else { setShowForm(false); resetForm(); loadMpp() }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('mpp').delete().eq('id', id)
    loadMpp()
  }

  const totalCommission = mppList.reduce((sum, v) => sum + (COMMISSION[v.product_type] ?? 0), 0)

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>MPP — {MONTHS[selectedMonth]} {selectedYear}</Text>
          <View style={styles.headerActions}>
            <AlertBell />
            <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowForm(true) }}>
              <Text style={styles.addButtonText}>+ Agregar MPP</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PeriodSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />

        {!loading && (
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: '#2471A3' }]}>
              <Text style={styles.kpiLabel}>MPP del mes</Text>
              <Text style={[styles.kpiValue, { fontSize: 24 }]}>${totalCommission.toLocaleString('es-CL')}</Text>
              <Text style={styles.kpiSub}>{mppList.length} mantenciones prepagadas</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiLabel, { color: Colors.textLight }]}>Comisión a pagar</Text>
              <Text style={[styles.kpiValue, { color: Colors.success, fontSize: 24 }]}>${totalCommission.toLocaleString('es-CL')}</Text>
              <Text style={[styles.kpiSub, { color: Colors.textLight }]}>Platinium $16k · Diamond $21k · Zafiro $26k</Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView style={styles.tableContainer}>
            {mppList.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No hay MPP en {MONTHS[selectedMonth]} {selectedYear}</Text>
              </View>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.cell, styles.cellN, styles.headCell]}>N°</Text>
                  <Text style={[styles.cell, styles.cellName, styles.headCell]}>Nombre Cliente</Text>
                  <Text style={[styles.cell, styles.cellRut, styles.headCell]}>RUT</Text>
                  <Text style={[styles.cell, styles.cellChassis, styles.headCell]}>Chasis</Text>
                  <Text style={[styles.cell, styles.cellType, styles.headCell]}>Tipo</Text>
                  <Text style={[styles.cell, styles.cellAction, styles.headCell]}></Text>
                </View>
                {mppList.map((item, index) => (
                  <View key={item.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.cell, styles.cellN]}>{index + 1}</Text>
                    <Text style={[styles.cell, styles.cellName]}>{item.client_name}</Text>
                    <Text style={[styles.cell, styles.cellRut]}>{item.rut}</Text>
                    <Text style={[styles.cell, styles.cellChassis, { color: Colors.textLight }]}>{item.chassis || '—'}</Text>
                    <View style={[styles.cell, styles.cellType]}>
                      <View style={[styles.badge, { backgroundColor: TYPE_COLOR[item.product_type] }]}>
                        <Text style={styles.badgeText}>{item.product_type}</Text>
                      </View>
                    </View>
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
            <Text style={styles.drawerTitle}>{editingId ? 'Editar MPP' : 'Nuevo MPP'}</Text>
            <Text style={styles.drawerSub}>{MONTHS[selectedMonth]} {selectedYear}</Text>
          </View>
          <TouchableOpacity onPress={() => { setShowForm(false); resetForm() }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.formError}>{error}</Text> : null}

          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, !manualMode && styles.modeToggleBtnActive]}
              onPress={() => { setManualMode(false); setClientName(''); setRut(''); setChassis('') }}
            >
              <Text style={[styles.modeToggleBtnText, !manualMode && styles.modeToggleBtnTextActive]}>Desde ventas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleBtn, manualMode && styles.modeToggleBtnActive]}
              onPress={() => { setManualMode(true); setClientName(''); setRut(''); setChassis('') }}
            >
              <Text style={[styles.modeToggleBtnText, manualMode && styles.modeToggleBtnTextActive]}>Ingreso manual</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nombre Cliente *</Text>
          {manualMode ? (
            <TextInput
              style={styles.input}
              value={clientName}
              onChangeText={v => setClientName(v.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()))}
              placeholder="Nombre completo del cliente"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
            />
          ) : (
            <ClientSearch
              value={clientName}
              rut={rut}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onChangeName={v => { setClientName(v); setRut('') }}
              onSelect={s => { setClientName(s.customer_name); setRut(s.rut); setChassis(s.chassis ?? '') }}
              includesChassis
            />
          )}

          <Text style={styles.label}>RUT *</Text>
          <TextInput
            style={[styles.input, !manualMode && { backgroundColor: '#F8F9FA', color: Colors.textLight }, manualMode && rut.length > 3 && !validateRut(rut) && styles.inputError]}
            value={rut}
            onChangeText={manualMode ? v => setRut(formatRut(v)) : undefined}
            editable={manualMode}
            placeholder={manualMode ? 'Ej: 12.345.678-9' : 'Se autocompleta al elegir cliente'}
            placeholderTextColor={Colors.textLight}
          />
          {manualMode && rut.length > 3 && !validateRut(rut) && (
            <Text style={styles.fieldError}>RUT inválido</Text>
          )}

          <Text style={styles.label}>Chasis</Text>
          <TextInput
            style={styles.input} value={chassis}
            onChangeText={v => setChassis(v.toUpperCase())}
            placeholder="Número de chasis" placeholderTextColor={Colors.textLight}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Tipo de Producto *</Text>
          <View style={styles.typeRow}>
            {PRODUCT_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, productType === type && { backgroundColor: TYPE_COLOR[type], borderColor: TYPE_COLOR[type] }]}
                onPress={() => setProductType(type)}
              >
                <Text style={[styles.typeBtnText, productType === type && styles.typeBtnTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.commissionNote}>
            <Text style={styles.commissionNoteText}>
              Comisión: ${COMMISSION[productType].toLocaleString('es-CL')}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowForm(false); resetForm() }}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>{editingId ? 'Guardar cambios' : 'Guardar MPP'}</Text>}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  cellType: { width: 100 },
  cellAction: { width: 72, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
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
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnText: { color: Colors.textLight, fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: Colors.white },
  commissionNote: { marginTop: 20, padding: 14, backgroundColor: '#F0F3F6', borderRadius: 8 },
  commissionNoteText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelButtonText: { color: Colors.textLight, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: Colors.white, fontWeight: 'bold' },
  modeToggleRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 4, backgroundColor: '#F0F3F6', borderRadius: 8, padding: 4 },
  modeToggleBtn: { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center' },
  modeToggleBtnActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeToggleBtnText: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  modeToggleBtnTextActive: { color: Colors.primary, fontWeight: '700' },
})
