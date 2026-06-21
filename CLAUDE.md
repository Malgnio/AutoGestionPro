@AGENTS.md

# AutoGestionPro — Contexto del proyecto

## Qué es
App web de gestión comercial para un equipo de vendedores de autos. Reemplaza un flujo en Excel con tabs mensuales. Cada vendedor usa su propia cuenta y ve solo sus datos (RLS en Supabase).

## Reglas importantes
- **Solo web** — nunca usar SafeAreaView, KeyboardAvoidingView ni lógica mobile
- **Siempre commitear y pushear** después de cada cambio de código (Vercel deploy es automático desde GitHub)
- **Formularios como drawer lateral** — panel deslizante desde la derecha, no modal centrado
- **Respuestas en español**, simples y directas

## Stack
- Expo v56 + expo-router + React Native Web
- Supabase (Auth + PostgreSQL + RLS) — proyecto: hjykvqxnzpjnqbgpeopf.supabase.co
- Vercel (deploy automático desde GitHub, rama `main`)
- `web.output: "single"` en app.json — crítico para SPA routing
- Variables de entorno con prefijo `EXPO_PUBLIC_`

## URL producción
https://auto-gestion-pro.vercel.app

## Estructura de rutas
```
app/
  _layout.tsx          — Root layout con auth redirect
  index.tsx            — Redirect a /(auth)/login
  login.tsx            — Alias SPA
  dashboard.tsx        — Alias SPA
  (auth)/login.tsx     — Pantalla de login
  (tabs)/
    _layout.tsx        — Sidebar 220px + Slot (NO Tabs), logo velocímetro SVG
    dashboard.tsx      — Resumen anual: KPIs + gráfico barras por mes
    sales.tsx          — Tabla ventas + drawer
    credits.tsx        — Tabla créditos + drawer
    insurance.tsx      — Tabla seguros + drawer
    vpp.tsx            — Tabla VPP (Vehículo en Parte de Pago) + drawer
    mpp.tsx            — Tabla MPP (Mantenciones Prepagadas) + drawer
    commissions.tsx    — Pantalla "Sueldo": tablas de tasas + resumen con sueldo base, bonos
    users.tsx          — Gestión de usuarios (solo admin)
components/
  PeriodSelector.tsx   — Selector año + mes (sin prefijo FY)
  ClientSearch.tsx     — Buscador de clientes desde ventas (últimos 4 meses), autocompleta RUT y chasis
lib/supabase.ts
lib/validateRut.ts
constants/colors.ts
hooks/useAuth.ts
```

## Datos que maneja
- **Ventas**: Cliente, RUT, Modelo, Chasis, OdV, Tipo (R=Retail, F=Flota, FL=Fleet)
- **Créditos**: Cliente, RUT, C.Dealer (monto), Tipo (CI=Crédito Inteligente, CC=Crédito Convencional)
- **Seguros**: Cliente, RUT, Chasis, Tipo (Light, Plus, Premium, Usados)
- **VPP**: Cliente, RUT, Chasis, PPU
- **MPP**: Cliente, RUT, Chasis, Tipo (Platinium, Diamond, Zafiro)

## Tablas Supabase
- `sales` — ventas
- `credits` — créditos (credit_type: 'CI' | 'CC')
- `insurance` — seguros
- `vpp` — vehículos en parte de pago
- `mpp` — mantenciones prepagadas
- `profiles` — datos de usuario (full_name, role)
- `salaries` — sueldo base por usuario y mes (UNIQUE user_id+month)
- `bonuses` — bonos por usuario y mes (descripción + monto)

Todas las tablas tienen RLS habilitado con política `auth.uid() = user_id`.

## Tablas de comisión
**Ventas** ($70.000 por unidad):
- Tasa adicional sobre precio (no aplica directamente): 1-5 → 6% | 6-8 → 8% | 9-11 → 9% | 12-14 → 10% | 15+ → 12%

**Créditos** (sobre monto C.Dealer sin IVA, por cantidad):
1 → 4% | 2 → 5% | 3-5 → 10% | 6-7 → 12% | 8 → 16% | 9+ → 17%

**Seguros**: $23.000 por póliza (todos los tipos)

**VPP**: $70.000 por vehículo

**MPP**: Platinium=$16.000 | Diamond=$21.000 | Zafiro=$26.000

## Penetración crédito
Meta: **70%** (créditos / ventas del mes)
- Verde: ≥70% | Naranja: 50-69% | Rojo: <50%

## Pantalla Sueldo (commissions.tsx)
Muestra por mes:
1. Sueldo Base (editable, guardado en tabla `salaries`)
2. Comisión por Unidades ($70k × unidades)
3. Comisión por Créditos (C.Dealer sin IVA × tasa)
4. Comisión por Seguros ($23k × seguros)
5. Comisión VPP ($70k × VPP)
6. Comisión MPP (según tipo)
7. Bonos (tabla `bonuses`, múltiples por mes, con descripción y monto)
8. **Sueldo Estimado** = todo lo anterior sumado

## Gestión de usuarios
- Edge Function `invite-user` crea usuarios directamente con contraseña (sin email de invitación)
- Secret en Supabase: `SERVICE_ROLE_KEY` (NO puede llamarse `SUPABASE_*`)
- Roles: `vendedor` (default) | `admin`
- Solo admins ven la sección Usuarios en el sidebar

## ClientSearch (componente reutilizable)
Usado en Seguros, VPP y MPP. Busca clientes en tabla `sales` de los últimos 4 meses, deduplica por RUT, autocompleta nombre + RUT + chasis al seleccionar. Permite escribir manualmente si el cliente no aparece.

## Drawer lateral (patrón para formularios)
```tsx
// Overlay
position: 'fixed', top/left/right/bottom: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.3)'

// Panel
position: 'fixed', top/right/bottom: 0, width: 460, zIndex: 101
transform: [{ translateX: 460 }]  // cerrado
transform: [{ translateX: 0 }]    // abierto
transition: 'transform 0.3s ease'
```

## Usuarios del sistema
- **Enrique Cisternas** (enrique.cisternasm@gmail.com) — cuenta de prueba original
- **Franco Parodi** (fparodit@gmail.com) — vendedor con datos copiados desde Enrique
- **Luis Cisternas** (lcistern@emeal.nttdata.com) — admin

## Pendiente
- Reasignar datos de Enrique a su cuenta propia una vez que tenga acceso
- Perfil gerente con vista consolidada (futuro)
