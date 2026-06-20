export function validateRut(rut: string): boolean {
  const clean = rut.replace(/[\.\-\s]/g, '').toUpperCase()
  if (clean.length < 2) return false

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)

  if (!/^\d+$/.test(body)) return false

  let sum = 0
  let mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }

  const remainder = 11 - (sum % 11)
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)

  return dv === expected
}

export function formatRut(rut: string): string {
  const clean = rut.replace(/[\.\-\s]/g, '').toUpperCase()
  if (clean.length < 2) return rut
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}
