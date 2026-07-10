import { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import AlertBell from '../../components/AlertBell'
import { formatRut } from '../../lib/validateRut'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

const selectStyle = {
  padding: '8px 12px', fontSize: 13, borderRadius: 8,
  border: `1px solid ${Colors.border}`, backgroundColor: Colors.white,
  color: Colors.text, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
} as any

type PortfolioRow = {
  id: string
  customer_name: string
  rut: string
  email: string | null
  phone: string | null
  birth_date: string | null
  model: string
  sale_month: string
  hasCredit: boolean
  hasVpp: boolean
  hasMpp: boolean
}

export default function PortfolioScreen() {
  const [rows, setRows] = useState<PortfolioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterMonth, setFilterMonth] = useState<number | null>(null)
  const [filterCredit, setFilterCredit] = useState<boolean | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Carga todos los años disponibles (desde el más antiguo disponible)
    const startYear = CURRENT_YEAR - 2
    const start = `${startYear}-01-01`
    const end = `${CURRENT_YEAR}-12-31`

    const [{ data: sales }, { data: credits }, { data: vpp }, { data: mpp }] = await Promise.all([
      supabase.from('sales').select('id, customer_name, rut, email, phone, birth_date, model, sale_month')
        .eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end)
        .order('sale_month', { ascending: true }),
      supabase.from('credits').select('rut').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('vpp').select('rut').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
      supabase.from('mpp').select('rut').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end),
    ])

    const norm = (r: string) => r.replace(/\./g, '').toLowerCase()
    const creditRuts = new Set(credits?.map(c => norm(c.rut)) ?? [])
    const vppRuts = new Set(vpp?.map(v => norm(v.rut)) ?? [])
    const mppRuts = new Set(mpp?.map(m => norm(m.rut)) ?? [])

    setRows((sales ?? []).map(s => ({
      id: s.id,
      customer_name: s.customer_name,
      rut: s.rut,
      email: s.email ?? null,
      phone: s.phone ?? null,
      birth_date: s.birth_date ?? null,
      model: s.model,
      sale_month: s.sale_month,
      hasCredit: creditRuts.has(norm(s.rut)),
      hasVpp: vppRuts.has(norm(s.rut)),
      hasMpp: mppRuts.has(norm(s.rut)),
    })))
    setLoading(false)
  }

  const filtered = useMemo(() => {
    setPage(1)
    const q = search.toLowerCase().trim()
    return rows.filter(r => {
      const rowYear = new Date(r.sale_month).getUTCFullYear()
      const rowMonth = new Date(r.sale_month).getUTCMonth()
      if (filterYear !== null && rowYear !== filterYear) return false
      if (filterMonth !== null && rowMonth !== filterMonth) return false
      if (filterCredit !== null && r.hasCredit !== filterCredit) return false
      if (q && !r.customer_name.toLowerCase().includes(q) && !formatRut(r.rut).toLowerCase().startsWith(q)) return false
      return true
    })
  }, [rows, search, filterYear, filterMonth, filterCredit])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const uniqueClients = useMemo(() => {
    const seen = new Set<string>()
    return filtered.filter(r => { if (seen.has(r.rut)) return false; seen.add(r.rut); return true }).length
  }, [filtered])

  const hasActiveFilter = search || filterYear !== null || filterMonth !== null || filterCredit !== null

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Clientes</Text>
          <AlertBell />
        </View>

        {!loading && (
          <>
            {/* KPI + búsqueda */}
            <View style={styles.topBar}>
              <View style={[styles.kpiCard, { backgroundColor: Colors.primary }]}>
                <Text style={styles.kpiLabel}>Clientes únicos</Text>
                <Text style={styles.kpiValue}>{uniqueClients}</Text>
                <Text style={styles.kpiSub}>{filtered.length} ventas mostradas</Text>
              </View>
              <View style={styles.searchWrapper}>
                {/* @ts-ignore */}
                <input
                  type="text"
                  placeholder="Buscar por nombre o RUT..."
                  value={search}
                  onChange={(e: any) => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', fontSize: 14,
                    border: `1px solid ${Colors.border}`, borderRadius: 8,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    color: Colors.text, backgroundColor: Colors.white,
                  } as any}
                />
              </View>
            </View>

            {/* Filtros */}
            <View style={styles.filtersBar}>
              {/* @ts-ignore */}
              <select
                value={filterYear ?? ''}
                onChange={(e: any) => setFilterYear(e.target.value ? Number(e.target.value) : null)}
                style={selectStyle}
              >
                <option value="">Todos los años</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {/* @ts-ignore */}
              <select
                value={filterMonth ?? ''}
                onChange={(e: any) => setFilterMonth(e.target.value !== '' ? Number(e.target.value) : null)}
                style={selectStyle}
              >
                <option value="">Todos los meses</option>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              {/* @ts-ignore */}
              <select
                value={filterCredit === null ? '' : filterCredit ? 'si' : 'no'}
                onChange={(e: any) => setFilterCredit(e.target.value === '' ? null : e.target.value === 'si')}
                style={selectStyle}
              >
                <option value="">Crédito: Todos</option>
                <option value="si">Crédito: Sí</option>
                <option value="no">Crédito: No</option>
              </select>
              {hasActiveFilter && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setSearch(''); setFilterYear(null); setFilterMonth(null); setFilterCredit(null) }}
                >
                  <Text style={styles.clearBtnText}>Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
          {/* @ts-ignore */}
          <div style={{ overflowX: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* @ts-ignore */}
            <div style={{ minWidth: 1100 }}>
              <View style={[styles.tableRow, styles.tableHead, { borderRadius: 12, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginHorizontal: 32 }]}>
                <Text style={[styles.cell, styles.cellN, styles.headCell]}>#</Text>
                <Text style={[styles.cell, styles.cellName, styles.headCell]}>Cliente</Text>
                <Text style={[styles.cell, styles.cellRut, styles.headCell]}>RUT</Text>
                <Text style={[styles.cell, styles.cellEmail, styles.headCell]}>Correo</Text>
                <Text style={[styles.cell, styles.cellPhone, styles.headCell]}>Teléfono</Text>
                <Text style={[styles.cell, styles.cellBirth, styles.headCell]}>Nacimiento</Text>
                <Text style={[styles.cell, styles.cellModel, styles.headCell]}>Modelo</Text>
                <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>Crédito</Text>
                <Text style={[styles.cell, styles.cellYear, styles.headCell]}>Año</Text>
                <Text style={[styles.cell, styles.cellMonth, styles.headCell]}>Mes</Text>
                <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>VPP</Text>
                <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>MPP</Text>
              </View>
            </div>
            <ScrollView style={[styles.tableContainer, { flex: 1 }]}>
              {/* @ts-ignore */}
              <div style={{ minWidth: 1100 }}>
              {filtered.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Sin resultados para los filtros aplicados</Text>
                </View>
              ) : (
                <View style={styles.table}>
                  {paginated.map((row, index) => (
                    <View key={row.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                      <Text style={[styles.cell, styles.cellN]}>{(page - 1) * PAGE_SIZE + index + 1}</Text>
                      <Text style={[styles.cell, styles.cellName]}>{row.customer_name}</Text>
                      <Text style={[styles.cell, styles.cellRut]}>{formatRut(row.rut)}</Text>
                      <Text style={[styles.cell, styles.cellEmail]} numberOfLines={1}>{row.email || '—'}</Text>
                      <Text style={[styles.cell, styles.cellPhone]}>{row.phone || '—'}</Text>
                      <Text style={[styles.cell, styles.cellBirth]}>{row.birth_date ? row.birth_date.split('-').reverse().join('/') : '—'}</Text>
                      <Text style={[styles.cell, styles.cellModel]} numberOfLines={1}>{row.model}</Text>
                      <View style={[styles.cell, styles.cellFlag]}>
                        <View style={[styles.badge, { backgroundColor: row.hasCredit ? Colors.success : '#BDC3C7' }]}>
                          <Text style={styles.badgeText}>{row.hasCredit ? 'Sí' : 'No'}</Text>
                        </View>
                      </View>
                      <Text style={[styles.cell, styles.cellYear]}>{new Date(row.sale_month).getUTCFullYear()}</Text>
                      <Text style={[styles.cell, styles.cellMonth]}>{MONTHS[new Date(row.sale_month).getUTCMonth()]}</Text>
                      <View style={[styles.cell, styles.cellFlag]}>
                        <View style={[styles.badge, { backgroundColor: row.hasVpp ? Colors.success : '#BDC3C7' }]}>
                          <Text style={styles.badgeText}>{row.hasVpp ? 'Sí' : 'No'}</Text>
                        </View>
                      </View>
                      <View style={[styles.cell, styles.cellFlag]}>
                        <View style={[styles.badge, { backgroundColor: row.hasMpp ? Colors.success : '#BDC3C7' }]}>
                          <Text style={styles.badgeText}>{row.hasMpp ? 'Sí' : 'No'}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {/* @ts-ignore */}
              </div>

              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                    onPress={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>‹ Anterior</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>Página {page} de {totalPages} · {filtered.length} registros</Text>
                  <TouchableOpacity
                    style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>Siguiente ›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          {/* @ts-ignore */}
          </div>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  main: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 32, paddingBottom: 12 },
  kpiCard: { borderRadius: 10, padding: 16, minWidth: 180 },
  kpiLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  kpiValue: { fontSize: 28, fontWeight: 'bold', color: Colors.white, marginBottom: 2 },
  kpiSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  searchWrapper: { flex: 1 },
  filtersBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingBottom: 12 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: Colors.danger },
  clearBtnText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  tableHeader: { paddingHorizontal: 32, backgroundColor: Colors.background },
  tableContainer: { flex: 1 },
  table: { backgroundColor: Colors.white, marginHorizontal: 32, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  tableHead: { backgroundColor: Colors.primary },
  rowEven: { backgroundColor: Colors.white },
  rowOdd: { backgroundColor: '#F8F9FA' },
  cell: { fontSize: 13, color: Colors.text, paddingHorizontal: 6 },
  headCell: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  cellN: { width: 36 },
  cellName: { flex: 2 },
  cellRut: { flex: 1.2 },
  cellEmail: { flex: 2, minWidth: 0 },
  cellPhone: { width: 110 },
  cellBirth: { width: 100 },
  cellModel: { flex: 1.8 },
  cellFlag: { width: 70, alignItems: 'center' },
  cellYear: { width: 55, textAlign: 'center' },
  cellMonth: { width: 90 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: Colors.textLight, fontSize: 15 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary },
  pageBtnDisabled: { borderColor: Colors.border },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  pageBtnTextDisabled: { color: Colors.textLight },
  pageInfo: { fontSize: 13, color: Colors.textLight },
})
