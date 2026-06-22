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
  status: 'Solicitado' | 'Facturado' | 'Entregado' | null
  requested_date: string | null
  invoiced_date: string | null
  delivery_date: string | null
}

const SALES_COMMISSION = [
  { min: 15, max: Infinity, rate: 0.12 },
  { min: 12, max: 14, rate: 0.10 },
  { min: 9, max: 11, rate: 0.09 },
  { min: 6, max: 8, rate: 0.08 },
  { min: 1, max: 5, rate: 0.06 },
]
function getSalesRate(u: number) { return SALES_COMMISSION.find(r => u >= r.min && u <= r.max)?.rate ?? 0 }

const PURCHASE_TYPES = ['R', 'F', 'FL', 'SEG'] as const
const PURCHASE_TYPE_LABEL: Record<string, string> = { R: 'Retail', F: 'Flota', FL: 'Fleet', SEG: 'Seguro' }
const BADGE_COLOR: Record<string, string> = { R: '#2E86C1', F: '#2E86C1', FL: '#1B4F72', SEG: '#8E44AD' }

const STATUSES = ['Solicitado', 'Facturado', 'Entregado'] as const
const STATUS_COLOR: Record<string, string> = {
  Solicitado: '#E67E22',
  Facturado: '#2471A3',
  Entregado: '#1E8449',
}
const STATUS_DATE_LABEL: Record<string, string> = {
  Solicitado: 'Fec. Solicitado',
  Facturado: 'Fec. Facturado',
  Entregado: 'Fec. Entregado',
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const TODAY = new Date().toISOString().split('T')[0]

function formatDateCL(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = dateStr.split('T')[0]
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function dateInput(value: string, onChange: (v: string) => void) {
  return (
    // @ts-ignore
    <input
      type="date"
      value={value}
      max={TODAY}
      onChange={(e: any) => onChange(e.target.value)}
      style={{
        border: `1px solid ${Colors.border}`, borderRadius: 8,
        padding: 10, fontSize: 14, color: Colors.text,
        fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', outline: 'none',
      } as any}
    />
  )
}

function getStatusDate(item: Sale): string | null {
  if (item.status === 'Solicitado') return item.requested_date
  if (item.status === 'Facturado') return item.invoiced_date
  if (item.status === 'Entregado') return item.delivery_date
  return null
}

export default function SalesScreen() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [sales, setSales] = useState<Sale[]>([])
  const [creditsCount, setCreditsCount] = useState(0)
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
  const [status, setStatus] = useState<'Solicitado' | 'Facturado' | 'Entregado' | null>(null)
  const [requestedDate, setRequestedDate] = useState('')
  const [invoicedDate, setInvoicedDate] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')

  useEffect(() => { loadSales() }, [selectedYear, selectedMonth])

  async function loadSales() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

    const [{ data }, { data: credits }] = await Promise.all([
      supabase.from('sales').select('id,customer_name,rut,model,chassis,odv,purchase_type,sale_month,status,requested_date,invoiced_date,delivery_date,created_at').eq('user_id', user.id)
        .gte('sale_month', start).lte('sale_month', end)
        .order('created_at', { ascending: true }),
      supabase.from('credits').select('id').eq('user_id', user.id)
        .gte('sale_month', start).lte('sale_month', end),
    ])

    setSales(data ?? [])
    setCreditsCount(credits?.length ?? 0)
    setLoading(false)
  }

  function resetForm() {
    setCustomerName(''); setRut(''); setModel(''); setChassis(''); setOdv('')
    setPurchaseType('R'); setStatus(null)
    setRequestedDate(''); setInvoicedDate(''); setDeliveryDate('')
    setError(''); setEditingId(null)
  }

  function openEdit(item: Sale) {
    setEditingId(item.id)
    setCustomerName(item.customer_name)
    setRut(item.rut)
    setModel(item.model)
    setChassis(item.chassis)
    setOdv(item.odv)
    setPurchaseType(item.purchase_type)
    setStatus(item.status ?? null)
    setRequestedDate(item.requested_date ?? '')
    setInvoicedDate(item.invoiced_date ?? '')
    setDeliveryDate(item.delivery_date ?? '')
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
    if (!user) { setSaving(false); return }

    const formattedRut = formatRut(rut)
    const payload = {
      customer_name: customerName, rut: formattedRut, model, chassis, odv,
      purchase_type: purchaseType, status: status || null,
      requested_date: requestedDate || null,
      invoiced_date: invoicedDate || null,
      delivery_date: deliveryDate || null,
    }

    if (editingId) {
      const { data, error } = await supabase.from('sales').update(payload).eq('id', editingId).select()
      setSaving(false)
      if (error) { setError(error.message) } else if (!data || data.length === 0) { setError('No se actualizó ningún registro. Verifica permisos.') } else { setShowForm(false); resetForm(); loadSales() }
    } else {
      const saleMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
      const { error } = await supabase.from('sales').insert({ user_id: user.id, sale_month: saleMonth, ...payload })
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

        {!loading && (() => {
          const salesCount = sales.length
          const salesRate = getSalesRate(salesCount)
          const penetration = salesCount > 0 ? Math.round((creditsCount / salesCount) * 100) : 0
          return (
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, styles.kpiHighlight]}>
                <Text style={styles.kpiLabel}>Unidades vendidas</Text>
                <Text style={styles.kpiValue}>{salesCount}</Text>
                <Text style={styles.kpiSub}>Tasa: {(salesRate * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiLabel, { color: Colors.textLight }]}>Créditos</Text>
                <Text style={[styles.kpiValue, { color: Colors.text }]}>{creditsCount}</Text>
                <Text style={[styles.kpiSub, { color: Colors.textLight }]}>del mes</Text>
              </View>
              <View style={[styles.kpiCard, {
                backgroundColor: penetration >= 70 ? Colors.success : penetration >= 50 ? Colors.accent : '#C0392B'
              }]}>
                <Text style={styles.kpiLabel}>Penetración</Text>
                <Text style={styles.kpiValue}>{penetration}%</Text>
                <Text style={styles.kpiSub}>Meta: 70%</Text>
              </View>
            </View>
          )
        })()}

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
                  <Text style={[styles.cell, styles.cellStatus, styles.headCell]}>Estado</Text>
                  <Text style={[styles.cell, styles.cellDate, styles.headCell]}>Fecha</Text>
                  <Text style={[styles.cell, styles.cellAction, styles.headCell]}></Text>
                </View>
                {sales.map((item, index) => {
                  const statusDate = getStatusDate(item)
                  return (
                    <View key={item.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                      <Text style={[styles.cell, styles.cellN]}>{index + 1}</Text>
                      <Text style={[styles.cell, styles.cellName]}>{item.customer_name}</Text>
                      <Text style={[styles.cell, styles.cellRut]}>{item.rut}</Text>
                      <Text style={[styles.cell, styles.cellModel]} numberOfLines={1}>{item.model}</Text>
                      <Text style={[styles.cell, styles.cellChassis]}>{item.chassis}</Text>
                      <Text style={[styles.cell, styles.cellOdv]}>{item.odv}</Text>
                      <View style={[styles.cell, styles.cellType]}>
                        <View style={[styles.badge, { backgroundColor: BADGE_COLOR[item.purchase_type] ?? Colors.secondary }]}>
                          <Text style={styles.badgeText}>{item.purchase_type}</Text>
                        </View>
                      </View>
                      <View style={[styles.cell, styles.cellStatus]}>
                        {item.status ? (
                          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] }]}>
                            <Text style={styles.badgeText}>{item.status}</Text>
                          </View>
                        ) : (
                          <Text style={{ color: Colors.textLight, fontSize: 13 }}>—</Text>
                        )}
                      </View>
                      <Text style={[styles.cell, styles.cellDate, { color: Colors.textLight }]}>
                        {formatDateCL(statusDate)}
                      </Text>
                      <View style={[styles.cell, styles.cellAction]}>
                        <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                          <Text style={styles.iconEdit}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                          <Text style={styles.iconDelete}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
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

          <Text style={styles.label}>Estado y fechas</Text>
          {STATUSES.map(s => (
            <View key={s} style={styles.statusRow}>
              <TouchableOpacity
                style={[styles.statusBtn, status === s && { backgroundColor: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] }]}
                onPress={() => setStatus(status === s ? null : s)}
              >
                <Text style={[styles.typeBtnText, status === s && styles.typeBtnTextActive]}>{s}</Text>
              </TouchableOpacity>
              <View style={styles.statusDateInput}>
                {s === 'Solicitado' && dateInput(requestedDate, setRequestedDate)}
                {s === 'Facturado' && dateInput(invoicedDate, setInvoicedDate)}
                {s === 'Entregado' && dateInput(deliveryDate, setDeliveryDate)}
              </View>
            </View>
          ))}
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
  kpiRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 32, paddingTop: 20, paddingBottom: 4 },
  kpiCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: Colors.border },
  kpiHighlight: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
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
  cellModel: { flex: 2 },
  cellChassis: { flex: 1.8 },
  cellOdv: { flex: 1 },
  cellType: { width: 60 },
  cellStatus: { width: 90 },
  cellDate: { width: 90 },
  cellAction: { width: 72, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  badge: { backgroundColor: Colors.secondary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: '#F0F3F6' },
  iconEdit: { fontSize: 14 },
  iconDelete: { fontSize: 14 },
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
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  typeBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { color: Colors.textLight, fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: Colors.white },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  statusBtn: { width: 100, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statusDateInput: { flex: 1 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelButtonText: { color: Colors.textLight, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: Colors.white, fontWeight: 'bold' },
})
