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
  AlertBell.tsx        — Campana de alertas, se monta en header de cada pantalla via React DOM portal
contexts/
  PeriodContext.tsx    — Contexto global de año/mes seleccionado, compartido entre todas las tabs y AlertBell
lib/supabase.ts
lib/validateRut.ts
constants/colors.ts
hooks/useAuth.ts
```

## Datos que maneja
- **Ventas**: Cliente, RUT, Modelo, Chasis, OdV, Tipo (R=Retail, F=Flota, FL=Fleet, SEG=Seguro), Estado (nullable), Fec. Solicitado, Fec. Llegada Suc., Fec. Facturado, Fec. Entregado
- **Créditos**: Cliente, RUT, C.Dealer (monto), Tipo (CI=Crédito Inteligente, CC=Crédito Convencional)
- **Seguros**: Cliente, RUT, Chasis, Tipo (Light, Plus, Premium, Usados)
- **VPP**: Cliente, RUT, Chasis, PPU
- **MPP**: Cliente, RUT, Chasis, Tipo (Platinium, Diamond, Zafiro)

## Tablas Supabase
- `sales` — ventas (status nullable, requested_date, arrival_date, invoiced_date, delivery_date)
- `credits` — créditos (credit_type: 'CI' | 'CC')
- `insurance` — seguros
- `vpp` — vehículos en parte de pago
- `mpp` — mantenciones prepagadas
- `profiles` — datos de usuario (full_name, role)
- `salaries` — sueldo base por usuario y mes (UNIQUE user_id+month)
- `bonuses` — bonos por usuario y mes (descripción + monto)
- `targets` — metas editables por usuario, mes y métrica (UNIQUE user_id+month+metric). Ej: `credit_penetration`
- `alert_actions` — alertas gestionadas (id, user_id, sale_id, created_at)

Todas las tablas tienen RLS habilitado con política `auth.uid() = user_id`.
**IMPORTANTE**: La tabla `sales` requiere política UPDATE explícita — ya creada: "Vendedor actualiza sus ventas".

## Tablas de comisión
**Ventas** ($70.000 por unidad):
- Tasa adicional sobre precio (no aplica directamente): 1-5 → 6% | 6-8 → 8% | 9-11 → 9% | 12-14 → 10% | 15+ → 12%

**Créditos** (sobre monto C.Dealer sin IVA, por cantidad):
1 → 4% | 2 → 5% | 3-5 → 10% | 6-7 → 12% | 8 → 16% | 9+ → 17%

**Seguros**: $23.000 por póliza (todos los tipos)

**VPP**: $70.000 por vehículo

**MPP**: Platinium=$16.000 | Diamond=$21.000 | Zafiro=$26.000

## Penetración crédito
- Meta editable por mes (guardada en tabla `targets`, métrica `credit_penetration`). Default: 70%
- La tarjeta de penetración es clickeable → muestra input inline para editar la meta
- Color de la tarjeta: Verde ≥meta | Naranja ≥70% de meta | Rojo <70% de meta
- Dashboard muestra "Meta promedio: XX%" = promedio de penetración de los meses con ≥1 venta

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

## Ventas — Estado y fechas
- `status`: nullable (sin default). Valores: 'Solicitado' | 'Llegada Suc.' | 'Facturado' | 'Entregado' | null
- Constraint en Supabase: `sales_status_check` incluye los 4 valores
- Cada estado tiene su propia fecha independiente:
  - Solicitado → `requested_date`
  - Llegada Suc. → `arrival_date`
  - Facturado → `invoiced_date`
  - Entregado → `delivery_date`
- La columna "Fecha" en la grilla muestra la fecha del estado activo
- Formato fecha en tabla: DD/MM/YYYY. Input con `max=hoy` (no permite fechas futuras)
- Botón "Limpiar" en drawer resetea estado y las 4 fechas a null
- Colores de estado: Solicitado=naranja, Llegada Suc.=morado, Facturado=azul, Entregado=verde

## Usuarios del sistema
- **Enrique Cisternas** (enrique.cisternasm@gmail.com) — cuenta sin datos (se movieron a Franco)
- **Franco Parodi** (fparodit@gmail.com) — vendedor activo, user_id: 9dfe6d4a-81f3-44df-a8e3-5907368feab3
- **Luis Cisternas** (lcistern@emeal.nttdata.com) — admin

## Sistema de alertas
- Tabla `alert_actions` en Supabase: `id, user_id, sale_id, created_at` — persiste alertas gestionadas
- Alerta se dispara cuando `status = 'Entregado'` y han pasado ≥3 días hábiles desde `delivery_date`
- El mes de la alerta corresponde al mes de `delivery_date` (no de `sale_month`)
- Componente `AlertBell` renderiza el panel via `createPortal(document.body)` — evita quedar detrás de `overflow:hidden`
- El panel se sincroniza con el `PeriodContext` (mismo mes/año que la pantalla activa)
- La campana aparece en el header de cada pantalla, al lado del botón de acción principal
- Check ○/✓ por alerta — toggle que inserta/elimina en `alert_actions`

## PeriodContext — estado global de periodo
- `contexts/PeriodContext.tsx` expone `{ selectedYear, selectedMonth, availableYears, setSelectedYear, setSelectedMonth, addYear }`
- Todas las tabs y `AlertBell` lo consumen — cambiar mes en cualquier pantalla actualiza la campana
- El provider envuelve `SidebarContent` en `_layout.tsx`
- `availableYears` inicia con [año-2, año-1, año actual]. Botón `+ YYYY` en PeriodSelector agrega el año siguiente
- Los años agregados viven en memoria (se pierden al recargar) — datos en Supabase persisten igual

## Modo visualización (👁️) — patrón común en todas las grillas
- Botón 👁️ en cada fila abre el drawer en modo solo lectura (`viewMode: true`)
- Campos de texto muestran valor plano (`viewValue` style), fechas con fondo gris y `readOnly`, botones tipo/estado no responden (`activeOpacity={1}`, no-op)
- Footer muestra solo botón "Cerrar" (sin Guardar ni Cancelar)
- Título del drawer: "Detalle X" en modo vista, "Editar X" en modo edición
- Aplicado en: Ventas, Créditos, Seguros, VPP, MPP
- `cellAction` width = 104 para alojar 3 iconos (👁️ ✏️ 🗑️)

## MPP — Modo ingreso manual
- Toggle "Desde ventas / Ingreso manual" en el drawer (oculto en viewMode)
- Modo manual: nombre en title case (primera letra mayúscula, resto minúscula), RUT con `formatRut` + validación en tiempo real
- Modo ventas: usa `ClientSearch` como siempre

## Dashboard — KPIs y tooltip mensual
- KPIs anuales: Ventas, Créditos, VPP, MPP, **Seguros** (card naranja con comisión total)
- Al hover sobre cada barra muestra: Ventas, Créditos, VPP, MPP, Seguros y Comisión total del mes
- Seguros incluidos en query del dashboard y en cálculo de comisión total ($23.000 × cantidad)

## Recuperar contraseña
- Link "¿Olvidaste tu contraseña?" en pantalla de login
- Llama a `supabase.auth.resetPasswordForEmail()` con redirect a `https://auto-gestion-pro.vercel.app/login`
- Al llegar por el link del email, `onAuthStateChange` detecta evento `PASSWORD_RECOVERY` y muestra formulario
- `detectSessionInUrl: true` en `lib/supabase.ts` — crítico para que Supabase lea el token del hash
- Límite Supabase plan gratuito: 2 emails/hora. Si se supera, esperar antes de reintentar
- Después de cambiar contraseña: cierra sesión y vuelve al login

## Versión
- **v1.0.0** — Release oficial inicial (tag en GitHub, 2026-06-21)
- **v1.1.0** — Sistema de alertas + PeriodContext global (tag en GitHub, 2026-06-27)
- **Sin tag** — (2026-07-01): modo vista 👁️ en todas las grillas, MPP ingreso manual, dashboard Seguros KPI, meta penetración editable, estado "Llegada Suc." en ventas

## Pendiente
- Verificar políticas UPDATE en otras tablas (credits, insurance, vpp, mpp) — sales ya tiene la suya
- Perfil gerente con vista consolidada (futuro)
- Considerar SMTP propio en Supabase para eliminar límite de emails de recuperación
