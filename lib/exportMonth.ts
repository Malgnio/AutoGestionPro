import * as XLSX from 'xlsx'
import { supabase } from './supabase'

const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const SALES_COMMISSION = [
  { min: 15, max: Infinity, rate: 0.12 },
  { min: 12, max: 14, rate: 0.10 },
  { min: 9, max: 11, rate: 0.09 },
  { min: 6, max: 8, rate: 0.08 },
  { min: 1, max: 5, rate: 0.06 },
]
const CREDIT_COMMISSION = [
  { min: 9, max: Infinity, rate: 0.17 },
  { min: 8, max: 8, rate: 0.16 },
  { min: 6, max: 7, rate: 0.12 },
  { min: 3, max: 5, rate: 0.10 },
  { min: 2, max: 2, rate: 0.05 },
  { min: 1, max: 1, rate: 0.04 },
]
const MPP_COMMISSION: Record<string, number> = { Platinium: 16000, Diamond: 21000, Zafiro: 26000 }

function getSalesRate(u: number) { return SALES_COMMISSION.find(r => u >= r.min && u <= r.max)?.rate ?? 0 }
function getCreditRate(c: number) { return CREDIT_COMMISSION.find(r => c >= r.min && c <= r.max)?.rate ?? 0 }

export async function exportMonth(year: number, month: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const start = new Date(year, month, 1).toISOString().split('T')[0]
  const end = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const [{ data: sales }, { data: credits }, { data: insurance }, { data: vpp }, { data: mpp }] = await Promise.all([
    supabase.from('sales').select('customer_name, rut, model, chassis, odv, purchase_type, status').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    supabase.from('credits').select('customer_name, rut, dealer_cost, credit_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    supabase.from('insurance').select('customer_name, rut, chassis, insurance_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    supabase.from('vpp').select('client_name, rut, ppu').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
    supabase.from('mpp').select('client_name, rut, product_type').eq('user_id', user.id).gte('sale_month', start).lte('sale_month', end).order('created_at', { ascending: true }),
  ])

  const s = sales ?? [], c = credits ?? [], ins = insurance ?? [], v = vpp ?? [], m = mpp ?? []
  const monthLabel = `${MONTHS_FULL[month]} ${year}`

  const creditCount = c.length
  const dealerTotal = c.reduce((sum, x) => sum + Number(x.dealer_cost), 0)
  const penetration = s.length > 0 ? Math.round((creditCount / s.length) * 100) : 0
  const salesComm = s.length * 70000
  const creditComm = Math.round(dealerTotal / 1.19 * getCreditRate(creditCount))
  const insuranceComm = ins.length * 23000
  const vppComm = v.length * 70000
  const mppComm = m.reduce((sum, x: any) => sum + (MPP_COMMISSION[x.product_type] ?? 0), 0)

  const resumen = [
    ['Mes', monthLabel],
    [],
    ['Métrica', 'Cantidad', 'Comisión'],
    ['Ventas', s.length, salesComm],
    ['Créditos', creditCount, creditComm],
    ['Penetración crédito', `${penetration}%`, ''],
    ['Seguros', ins.length, insuranceComm],
    ['VPP', v.length, vppComm],
    ['MPP', m.length, mppComm],
    [],
    ['Total comisión', '', salesComm + creditComm + insuranceComm + vppComm + mppComm],
  ]

  const ventasRows = [
    ['#', 'Cliente', 'RUT', 'Modelo', 'Chasis', 'OdV', 'Tipo', 'Estado'],
    ...s.map((x: any, i: number) => [i + 1, x.customer_name, x.rut, x.model, x.chassis, x.odv, x.purchase_type, x.status ?? '']),
  ]
  const creditosRows = [
    ['#', 'Cliente', 'RUT', 'C.Dealer', 'Tipo'],
    ...c.map((x: any, i: number) => [i + 1, x.customer_name, x.rut, Number(x.dealer_cost), x.credit_type]),
  ]
  const segurosRows = [
    ['#', 'Cliente', 'RUT', 'Chasis', 'Tipo'],
    ...ins.map((x: any, i: number) => [i + 1, x.customer_name, x.rut, x.chassis, x.insurance_type]),
  ]
  const vppRows = [
    ['#', 'Cliente', 'RUT', 'PPU'],
    ...v.map((x: any, i: number) => [i + 1, x.client_name, x.rut, x.ppu]),
  ]
  const mppRows = [
    ['#', 'Cliente', 'RUT', 'Tipo Producto'],
    ...m.map((x: any, i: number) => [i + 1, x.client_name, x.rut, x.product_type]),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ventasRows), 'Ventas')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(creditosRows), 'Créditos')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(segurosRows), 'Seguros')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vppRows), 'VPP')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mppRows), 'MPP')
  XLSX.writeFile(wb, `AutoGestion_${MONTHS_FULL[month]}_${year}.xlsx`)
}
