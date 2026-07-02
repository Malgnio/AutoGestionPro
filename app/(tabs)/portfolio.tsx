import { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import AlertBell from '../../components/AlertBell'
import { formatRut } from '../../lib/validateRut'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

type PortfolioRow = {
  id: string
  customer_name: string
  rut: string
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
      supabase.from('sales').select('id, customer_name, rut, model, sale_month')
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
      model: s.model,
      sale_month: s.sale_month,
      hasCredit: creditRuts.has(norm(s.rut)),
      hasVpp: vppRuts.has(norm(s.rut)),
      hasMpp: mppRuts.has(norm(s.rut)),
    })))
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rows.filter(r => {
      const rowYear = new Date(r.sale_month).getUTCFullYear()
      const rowMonth = new Date(r.sale_month).getUTCMonth()
      if (filterYear !== null && rowYear !== filterYear) return false
      if (filterMonth !== null && rowMonth !== filterMonth) return false
      if (filterCredit !== null && r.hasCredit !== filterCredit) return false
      if (q && !r.customer_name.toLowerCase().includes(q) && !r.rut.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, filterYear, filterMonth, filterCredit])

  const uniqueClients = useMemo(() => {
    const seen = new Set<string>()
    return filtered.filter(r => { if (seen.has(r.rut)) return false; seen.add(r.rut); return true }).length
  }, [filtered])

  const hasActiveFilter = search || filterYear !== null || filterMonth !== null || filterCredit !== null

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Cartera de Clientes</Text>
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
              {/* Año */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Año</Text>
                <View style={styles.filterBtns}>
                  <TouchableOpacity
                    style={[styles.filterBtn, filterYear === null && styles.filterBtnActive]}
                    onPress={() => setFilterYear(null)}
                  >
                    <Text style={[styles.filterBtnText, filterYear === null && styles.filterBtnTextActive]}>Todos</Text>
                  </TouchableOpacity>
                  {YEARS.map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.filterBtn, filterYear === y && styles.filterBtnActive]}
                      onPress={() => setFilterYear(filterYear === y ? null : y)}
                    >
                      <Text style={[styles.filterBtnText, filterYear === y && styles.filterBtnTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Mes */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Mes</Text>
                <View style={styles.filterBtns}>
                  <TouchableOpacity
                    style={[styles.filterBtn, filterMonth === null && styles.filterBtnActive]}
                    onPress={() => setFilterMonth(null)}
                  >
                    <Text style={[styles.filterBtnText, filterMonth === null && styles.filterBtnTextActive]}>Todos</Text>
                  </TouchableOpacity>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.filterBtn, filterMonth === i && styles.filterBtnActive]}
                      onPress={() => setFilterMonth(filterMonth === i ? null : i)}
                    >
                      <Text style={[styles.filterBtnText, filterMonth === i && styles.filterBtnTextActive]}>{m.slice(0, 3)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Crédito */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Crédito</Text>
                <View style={styles.filterBtns}>
                  {([null, true, false] as (boolean | null)[]).map((v, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.filterBtn, filterCredit === v && styles.filterBtnActive]}
                      onPress={() => setFilterCredit(filterCredit === v ? null : v)}
                    >
                      <Text style={[styles.filterBtnText, filterCredit === v && styles.filterBtnTextActive]}>
                        {v === null ? 'Todos' : v ? 'Sí' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {hasActiveFilter && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setSearch(''); setFilterYear(null); setFilterMonth(null); setFilterCredit(null) }}
                >
                  <Text style={styles.clearBtnText}>Limpiar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView style={styles.tableContainer}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Sin resultados para los filtros aplicados</Text>
              </View>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.cell, styles.cellN, styles.headCell]}>#</Text>
                  <Text style={[styles.cell, styles.cellName, styles.headCell]}>Cliente</Text>
                  <Text style={[styles.cell, styles.cellRut, styles.headCell]}>RUT</Text>
                  <Text style={[styles.cell, styles.cellModel, styles.headCell]}>Modelo</Text>
                  <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>Crédito</Text>
                  <Text style={[styles.cell, styles.cellYear, styles.headCell]}>Año</Text>
                  <Text style={[styles.cell, styles.cellMonth, styles.headCell]}>Mes</Text>
                  <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>VPP</Text>
                  <Text style={[styles.cell, styles.cellFlag, styles.headCell]}>MPP</Text>
                </View>
                {filtered.map((row, index) => (
                  <View key={row.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.cell, styles.cellN]}>{index + 1}</Text>
                    <Text style={[styles.cell, styles.cellName]}>{row.customer_name}</Text>
                    <Text style={[styles.cell, styles.cellRut]}>{formatRut(row.rut)}</Text>
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
          </ScrollView>
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
  filtersBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, paddingHorizontal: 32, paddingBottom: 12 },
  filterGroup: { gap: 6 },
  filterLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '600', textTransform: 'uppercase' },
  filterBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterBtnText: { fontSize: 12, color: Colors.textLight, fontWeight: '500' },
  filterBtnTextActive: { color: Colors.white, fontWeight: '600' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: Colors.danger, alignSelf: 'flex-end' },
  clearBtnText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  tableContainer: { flex: 1, paddingHorizontal: 32, paddingTop: 4 },
  table: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  tableHead: { backgroundColor: Colors.primary },
  rowEven: { backgroundColor: Colors.white },
  rowOdd: { backgroundColor: '#F8F9FA' },
  cell: { fontSize: 13, color: Colors.text, paddingHorizontal: 6 },
  headCell: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  cellN: { width: 36 },
  cellName: { flex: 2 },
  cellRut: { flex: 1.2 },
  cellModel: { flex: 1.8 },
  cellFlag: { width: 70, alignItems: 'center' },
  cellYear: { width: 55, textAlign: 'center' },
  cellMonth: { width: 90 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { color: Colors.textLight, fontSize: 15 },
})
