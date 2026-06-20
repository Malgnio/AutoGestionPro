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
- Supabase (Auth + PostgreSQL + RLS)
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
    _layout.tsx        — Sidebar 220px + Slot (NO Tabs)
    dashboard.tsx      — Resumen: stats + comisiones
    sales.tsx          — Tabla ventas + drawer
    credits.tsx        — Tabla créditos + drawer
    commissions.tsx    — Tablas de tasas de comisión
components/
  PeriodSelector.tsx   — Selector año (FY20XX) + mes
lib/supabase.ts
constants/colors.ts
hooks/useAuth.ts
```

## Datos que maneja
- **Ventas**: Cliente, RUT, Modelo, Chasis, OdV, Tipo (R=Retail, F=Flota, FL=Fleet)
- **Créditos**: Cliente, RUT, C.Dealer (monto), Tipo (CI=Crédito Interno, CC=Crédito Externo)

## Tablas de comisión
**Ventas** (por unidades vendidas en el mes):
1-5 → 6% | 6-8 → 8% | 9-11 → 9% | 12-14 → 10% | 15+ → 12%

**Créditos** (sobre monto C.Dealer, por cantidad de créditos):
1 → 4% | 2 → 5% | 3-5 → 10% | 6-7 → 12% | 8 → 16% | 9+ → 17%

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

## Pendiente
- Selector de período en pantalla Comisiones
- Perfil gerente con vista consolidada (futuro)
