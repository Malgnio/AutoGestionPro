import XLS from 'xlsx-js-style'
import { supabase } from './supabase'

const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const CREDIT_COMMISSION = [
  { min: 9, max: Infinity, rate: 0.17 },
  { min: 8, max: 8, rate: 0.16 },
  { min: 6, max: 7, rate: 0.12 },
  { min: 3, max: 5, rate: 0.10 },
  { min: 2, max: 2, rate: 0.05 },
  { min: 1, max: 1, rate: 0.04 },
]
const MPP_COMMISSION: Record<string, number> = { Platinium: 16000, Diamond: 21000, Zafiro: 26000 }

function getCreditRate(c: number) { return CREDIT_COMMISSION.find(r => c >= r.min && c <= r.max)?.rate ?? 0 }

// ─── Estilos ────────────────────────────────────────────────────────────────

const HEADER_FILL = { fgColor: { rgb: '1B3A5C' } }   // azul oscuro
const TOTAL_FILL  = { fgColor: { rgb: '2E86C1' } }   // azul medio
const ALT_FILL    = { fgColor: { rgb: 'EBF2FA' } }   // azul muy claro
const GREEN_FILL  = { fgColor: { rgb: '1E8449' } }   // verde oscuro

const WHITE_BOLD  = { bold: true, color: { rgb: 'FFFFFF' }, name: 'Calibri', sz: 11 }
const WHITE_NORM  = { color: { rgb: 'FFFFFF' }, name: 'Calibri', sz: 11 }
const DARK_BOLD   = { bold: true, color: { rgb: '1B3A5C' }, name: 'Calibri', sz: 11 }
const DARK_NORM   = { color: { rgb: '333333' }, name: 'Calibri', sz: 11 }

const BORDER_THIN = {
  top:    { style: 'thin', color: { rgb: 'D0D7DE' } },
  bottom: { style: 'thin', color: { rgb: 'D0D7DE' } },
  left:   { style: 'thin', color: { rgb: 'D0D7DE' } },
  right:  { style: 'thin', color: { rgb: 'D0D7DE' } },
}

function hCell(v: string) {
  return { v, t: 's', s: { fill: HEADER_FILL, font: WHITE_BOLD, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN } }
}

function tCell(v: string) {
  return { v, t: 's', s: { fill: TOTAL_FILL, font: WHITE_BOLD, alignment: { horizontal: 'left', vertical: 'center' }, border: BORDER_THIN } }
}

function tNumCell(v: number) {
  return { v, t: 'n', s: { fill: TOTAL_FILL, font: WHITE_BOLD, alignment: { horizontal: 'right', vertical: 'center' }, border: BORDER_THIN }, z: '$#,##0' }
}

function dCell(v: string, alt: boolean) {
  const fill = alt ? ALT_FILL : { fgColor: { rgb: 'FFFFFF' } }
  return { v, t: 's', s: { fill, font: DARK_NORM, alignment: { horizontal: 'left', vertical: 'center', wrapText: false }, border: BORDER_THIN } }
}

function nCell(v: number, alt: boolean, fmt = '$#,##0') {
  const fill = alt ? ALT_FILL : { fgColor: { rgb: 'FFFFFF' } }
  return { v, t: 'n', s: { fill, font: DARK_NORM, alignment: { horizontal: 'right', vertical: 'center' }, border: BORDER_THIN }, z: fmt }
}

function numCell(v: number, alt: boolean) {
  const fill = alt ? ALT_FILL : { fgColor: { rgb: 'FFFFFF' } }
  return { v, t: 'n', s: { fill, font: DARK_NORM, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN }, z: '0' }
}

function pctCell(v: number, alt: boolean) {
  const fill = alt ? ALT_FILL : { fgColor: { rgb: 'FFFFFF' } }
  return { v: v / 100, t: 'n', s: { fill, font: DARK_NORM, alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER_THIN }, z: '0%' }
}

function titleCell(v: string) {
  return { v, t: 's', s: { fill: GREEN_FILL, font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Calibri', sz: 14 }, alignment: { horizontal: 'left', vertical: 'center' } } }
}

function labelCell(v: string) {
  return { v, t: 's', s: { font: DARK_BOLD, alignment: { horizontal: 'left', vertical: 'center' }, border: BORDER_THIN } }
}

function valueCell(v: string) {
  return { v, t: 's', s: { font: DARK_NORM, alignment: { horizontal: 'left', vertical: 'center' }, border: BORDER_THIN } }
}

function valueNumCell(v: number, fmt = '$#,##0') {
  return { v, t: 'n', s: { font: DARK_NORM, alignment: { horizontal: 'right', vertical: 'center' }, border: BORDER_THIN }, z: fmt }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function setColWidths(ws: any, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

function setRowHeight(ws: any, rowIdx: number, hpt: number) {
  if (!ws['!rows']) ws['!rows'] = []
  ws['!rows'][rowIdx] = { hpt }
}

function aoaToSheet(data: any[][]): any {
  const ws: any = {}
  let maxRow = 0, maxCol = 0
  data.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === undefined || cell === null) return
      ws[XLS.utils.encode_cell({ r, c })] = cell
      if (c > maxCol) maxCol = c
    })
    if (r > maxRow) maxRow = r
  })
  ws['!ref'] = XLS.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } })
  return ws
}

// ─── Hoja Resumen ───────────────────────────────────────────────────────────

function buildResumen(monthLabel: string, s: any[], c: any[], ins: any[], v: any[], m: any[]) {
  const creditCount = c.length
  const dealerTotal = c.reduce((sum, x) => sum + Number(x.dealer_cost), 0)
  const penetration = s.length > 0 ? Math.round((creditCount / s.length) * 100) : 0
  const salesComm    = s.length * 70000
  const creditComm   = Math.round(dealerTotal / 1.19 * getCreditRate(creditCount))
  const insuranceComm = ins.length * 23000
  const vppComm      = v.length * 70000
  const mppComm      = m.reduce((sum, x) => sum + (MPP_COMMISSION[x.product_type] ?? 0), 0)
  const totalComm    = salesComm + creditComm + insuranceComm + vppComm + mppComm

  const rows: any[][] = [
    [titleCell(`AutoGestión Pro — ${monthLabel}`), null, null],
    [],
    [hCell('Métrica'), hCell('Cantidad'), hCell('Comisión')],
    [labelCell('Ventas'),              numCell(s.length, false),       valueNumCell(salesComm)],
    [labelCell('Créditos'),            numCell(creditCount, true),     valueNumCell(creditComm)],
    [labelCell('Penetración crédito'), pctCell(penetration, false),    valueCell('')],
    [labelCell('Seguros'),             numCell(ins.length, true),      valueNumCell(insuranceComm)],
    [labelCell('VPP'),                 numCell(v.length, false),       valueNumCell(vppComm)],
    [labelCell('MPP'),                 numCell(m.length, true),        valueNumCell(mppComm)],
    [],
    [tCell('Total comisión'), null, tNumCell(totalComm)],
  ]

  const ws = aoaToSheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },   // título
    { s: { r: 10, c: 0 }, e: { r: 10, c: 1 } },  // "Total comisión"
  ]
  setColWidths(ws, [26, 14, 18])
  setRowHeight(ws, 0, 28)
  setRowHeight(ws, 2, 20)
  return ws
}

// ─── Hoja Ventas ────────────────────────────────────────────────────────────

function buildVentas(data: any[]) {
  const headers = ['#', 'Cliente', 'RUT', 'Modelo', 'Chasis', 'OdV', 'Tipo', 'Estado']
  const rows: any[][] = [[...headers.map(hCell)]]
  data.forEach((x, i) => {
    const alt = i % 2 === 1
    rows.push([
      numCell(i + 1, alt),
      dCell(x.customer_name, alt),
      dCell(x.rut, alt),
      dCell(x.model, alt),
      dCell(x.chassis, alt),
      dCell(x.odv, alt),
      dCell(x.purchase_type, alt),
      dCell(x.status ?? '—', alt),
    ])
  })
  const ws = aoaToSheet(rows)
  setColWidths(ws, [5, 30, 16, 28, 22, 14, 8, 14])
  setRowHeight(ws, 0, 20)
  return ws
}

// ─── Hoja Créditos ──────────────────────────────────────────────────────────

function buildCreditos(data: any[]) {
  const headers = ['#', 'Cliente', 'RUT', 'C.Dealer', 'Sin IVA', 'Tipo']
  const rows: any[][] = [[...headers.map(hCell)]]
  data.forEach((x, i) => {
    const alt = i % 2 === 1
    const sinIva = Math.round(Number(x.dealer_cost) / 1.19)
    rows.push([
      numCell(i + 1, alt),
      dCell(x.customer_name, alt),
      dCell(x.rut, alt),
      nCell(Number(x.dealer_cost), alt),
      nCell(sinIva, alt),
      dCell(x.credit_type, alt),
    ])
  })
  const ws = aoaToSheet(rows)
  setColWidths(ws, [5, 30, 16, 16, 16, 22])
  setRowHeight(ws, 0, 20)
  return ws
}

// ─── Hoja Seguros ───────────────────────────────────────────────────────────

function buildSeguros(data: any[]) {
  const headers = ['#', 'Cliente', 'RUT', 'Chasis', 'Tipo', 'Comisión']
  const rows: any[][] = [[...headers.map(hCell)]]
  data.forEach((x, i) => {
    const alt = i % 2 === 1
    rows.push([
      numCell(i + 1, alt),
      dCell(x.customer_name, alt),
      dCell(x.rut, alt),
      dCell(x.chassis, alt),
      dCell(x.insurance_type, alt),
      nCell(23000, alt),
    ])
  })
  const ws = aoaToSheet(rows)
  setColWidths(ws, [5, 30, 16, 22, 12, 14])
  setRowHeight(ws, 0, 20)
  return ws
}

// ─── Hoja VPP ───────────────────────────────────────────────────────────────

function buildVpp(data: any[]) {
  const headers = ['#', 'Cliente', 'RUT', 'PPU', 'Comisión']
  const rows: any[][] = [[...headers.map(hCell)]]
  data.forEach((x, i) => {
    const alt = i % 2 === 1
    rows.push([
      numCell(i + 1, alt),
      dCell(x.client_name, alt),
      dCell(x.rut, alt),
      dCell(x.ppu, alt),
      nCell(70000, alt),
    ])
  })
  const ws = aoaToSheet(rows)
  setColWidths(ws, [5, 30, 16, 14, 14])
  setRowHeight(ws, 0, 20)
  return ws
}

// ─── Hoja MPP ───────────────────────────────────────────────────────────────

function buildMpp(data: any[]) {
  const headers = ['#', 'Cliente', 'RUT', 'Tipo Producto', 'Comisión']
  const rows: any[][] = [[...headers.map(hCell)]]
  data.forEach((x, i) => {
    const alt = i % 2 === 1
    const comm = MPP_COMMISSION[x.product_type] ?? 0
    rows.push([
      numCell(i + 1, alt),
      dCell(x.client_name, alt),
      dCell(x.rut, alt),
      dCell(x.product_type, alt),
      nCell(comm, alt),
    ])
  })
  const ws = aoaToSheet(rows)
  setColWidths(ws, [5, 30, 16, 16, 14])
  setRowHeight(ws, 0, 20)
  return ws
}

// ─── Export mes ─────────────────────────────────────────────────────────────

export async function exportMonth(year: number, month: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const start = new Date(year, month, 1).toISOString().split('T')[0]
  const end   = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const [{ data: sales }, { data: credits }, { data: insurance }, { data: vpp }, { data: mpp }] = await Promise.all([
    supabase.from('sales').select('customer_name, rut, model, chassis, odv, purchase_type, status').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    supabase.from('credits').select('customer_name, rut, dealer_cost, credit_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    supabase.from('insurance').select('customer_name, rut, chassis, insurance_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    supabase.from('vpp').select('client_name, rut, ppu').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    supabase.from('mpp').select('client_name, rut, product_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
  ])

  const s = sales ?? [], c = credits ?? [], ins = insurance ?? [], v = vpp ?? [], m = mpp ?? []
  const monthLabel = `${MONTHS_FULL[month]} ${year}`

  const wb = XLS.utils.book_new()
  XLS.utils.book_append_sheet(wb, buildResumen(monthLabel, s, c, ins, v, m), 'Resumen')
  XLS.utils.book_append_sheet(wb, buildVentas(s), 'Ventas')
  XLS.utils.book_append_sheet(wb, buildCreditos(c), 'Créditos')
  XLS.utils.book_append_sheet(wb, buildSeguros(ins), 'Seguros')
  XLS.utils.book_append_sheet(wb, buildVpp(v), 'VPP')
  XLS.utils.book_append_sheet(wb, buildMpp(m), 'MPP')
  XLS.writeFile(wb, `AutoGestion_${MONTHS_FULL[month]}_${year}.xlsx`)
}

// ─── Export año completo ────────────────────────────────────────────────────

export async function exportYear(year: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const wb = XLS.utils.book_new()

  // Hoja resumen anual
  const resumenHeaders = ['Mes', 'Ventas', 'Créditos', 'Penetración', 'Seguros', 'VPP', 'MPP', 'Comisión Total']
  const resumenRows: any[][] = [[...resumenHeaders.map(hCell)]]

  const allVentas: any[][] = [[...['#', 'Mes', 'Cliente', 'RUT', 'Modelo', 'Chasis', 'OdV', 'Tipo', 'Estado'].map(hCell)]]
  const allCreditos: any[][] = [[...['#', 'Mes', 'Cliente', 'RUT', 'C.Dealer', 'Sin IVA', 'Tipo'].map(hCell)]]
  const allSeguros: any[][] = [[...['#', 'Mes', 'Cliente', 'RUT', 'Chasis', 'Tipo', 'Comisión'].map(hCell)]]
  const allVpp: any[][] = [[...['#', 'Mes', 'Cliente', 'RUT', 'PPU', 'Comisión'].map(hCell)]]
  const allMpp: any[][] = [[...['#', 'Mes', 'Cliente', 'RUT', 'Tipo Producto', 'Comisión'].map(hCell)]]

  let rowCounters = { ventas: 0, creditos: 0, seguros: 0, vpp: 0, mpp: 0 }

  for (let mo = 0; mo < 12; mo++) {
    const start = new Date(year, mo, 1).toISOString().split('T')[0]
    const end   = new Date(year, mo + 1, 0).toISOString().split('T')[0]
    const [{ data: sales }, { data: credits }, { data: insurance }, { data: vpp }, { data: mpp }] = await Promise.all([
      supabase.from('sales').select('customer_name, rut, model, chassis, odv, purchase_type, status').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
      supabase.from('credits').select('customer_name, rut, dealer_cost, credit_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
      supabase.from('insurance').select('customer_name, rut, chassis, insurance_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
      supabase.from('vpp').select('client_name, rut, ppu').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
      supabase.from('mpp').select('client_name, rut, product_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    ])

    const s = sales ?? [], c = credits ?? [], ins = insurance ?? [], v = vpp ?? [], m = mpp ?? []
    const monthLabel = MONTHS_FULL[mo]
    const creditCount = c.length
    const dealerTotal = c.reduce((sum, x) => sum + Number(x.dealer_cost), 0)
    const penetration = s.length > 0 ? Math.round((creditCount / s.length) * 100) : 0
    const salesComm = s.length * 70000
    const creditComm = Math.round(dealerTotal / 1.19 * getCreditRate(creditCount))
    const insuranceComm = ins.length * 23000
    const vppComm = v.length * 70000
    const mppComm = m.reduce((sum, x: any) => sum + (MPP_COMMISSION[x.product_type] ?? 0), 0)
    const totalComm = salesComm + creditComm + insuranceComm + vppComm + mppComm

    const alt = mo % 2 === 1
    resumenRows.push([
      dCell(monthLabel, alt),
      numCell(s.length, alt),
      numCell(creditCount, alt),
      pctCell(penetration, alt),
      numCell(ins.length, alt),
      numCell(v.length, alt),
      numCell(m.length, alt),
      nCell(totalComm, alt),
    ])

    s.forEach((x, i) => { rowCounters.ventas++; allVentas.push([numCell(rowCounters.ventas, alt), dCell(monthLabel, alt), dCell(x.customer_name, alt), dCell(x.rut, alt), dCell(x.model, alt), dCell(x.chassis, alt), dCell(x.odv, alt), dCell(x.purchase_type, alt), dCell(x.status ?? '—', alt)]) })
    c.forEach((x, i) => { rowCounters.creditos++; allCreditos.push([numCell(rowCounters.creditos, alt), dCell(monthLabel, alt), dCell(x.customer_name, alt), dCell(x.rut, alt), nCell(Number(x.dealer_cost), alt), nCell(Math.round(Number(x.dealer_cost) / 1.19), alt), dCell(x.credit_type, alt)]) })
    ins.forEach((x, i) => { rowCounters.seguros++; allSeguros.push([numCell(rowCounters.seguros, alt), dCell(monthLabel, alt), dCell(x.customer_name, alt), dCell(x.rut, alt), dCell(x.chassis, alt), dCell(x.insurance_type, alt), nCell(23000, alt)]) })
    v.forEach((x, i) => { rowCounters.vpp++; allVpp.push([numCell(rowCounters.vpp, alt), dCell(monthLabel, alt), dCell(x.client_name, alt), dCell(x.rut, alt), dCell(x.ppu, alt), nCell(70000, alt)]) })
    m.forEach((x, i) => { rowCounters.mpp++; allMpp.push([numCell(rowCounters.mpp, alt), dCell(monthLabel, alt), dCell(x.client_name, alt), dCell(x.rut, alt), dCell(x.product_type, alt), nCell(MPP_COMMISSION[x.product_type] ?? 0, alt)]) })
  }

  const wsResumen = aoaToSheet(resumenRows)
  setColWidths(wsResumen, [14, 10, 10, 14, 10, 8, 8, 18])
  setRowHeight(wsResumen, 0, 20)

  const wsVentas = aoaToSheet(allVentas)
  setColWidths(wsVentas, [5, 12, 30, 16, 28, 22, 14, 8, 14])
  setRowHeight(wsVentas, 0, 20)

  const wsCreditos = aoaToSheet(allCreditos)
  setColWidths(wsCreditos, [5, 12, 30, 16, 16, 16, 10])
  setRowHeight(wsCreditos, 0, 20)

  const wsSeguros = aoaToSheet(allSeguros)
  setColWidths(wsSeguros, [5, 12, 30, 16, 22, 12, 14])
  setRowHeight(wsSeguros, 0, 20)

  const wsVpp = aoaToSheet(allVpp)
  setColWidths(wsVpp, [5, 12, 30, 16, 14, 14])
  setRowHeight(wsVpp, 0, 20)

  const wsMpp = aoaToSheet(allMpp)
  setColWidths(wsMpp, [5, 12, 30, 16, 16, 14])
  setRowHeight(wsMpp, 0, 20)

  XLS.utils.book_append_sheet(wb, wsResumen, 'Resumen Anual')
  XLS.utils.book_append_sheet(wb, wsVentas, 'Ventas')
  XLS.utils.book_append_sheet(wb, wsCreditos, 'Créditos')
  XLS.utils.book_append_sheet(wb, wsSeguros, 'Seguros')
  XLS.utils.book_append_sheet(wb, wsVpp, 'VPP')
  XLS.utils.book_append_sheet(wb, wsMpp, 'MPP')
  XLS.writeFile(wb, `AutoGestion_${year}.xlsx`)
}
