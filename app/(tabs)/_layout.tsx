import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Slot, useRouter, usePathname } from 'expo-router'
import { Colors } from '../../constants/colors'
import { supabase } from '../../lib/supabase'

const NAV_ITEMS = [
  { label: 'Resumen', icon: '📊', path: '/(tabs)/dashboard' },
  { label: 'Ventas', icon: '🚗', path: '/(tabs)/sales' },
  { label: 'Créditos', icon: '💳', path: '/(tabs)/credits' },
  { label: 'Seguros', icon: '🛡️', path: '/(tabs)/insurance' },
  { label: 'VPP', icon: '🔄', path: '/(tabs)/vpp' },
  { label: 'MPP', icon: '🔧', path: '/(tabs)/mpp' },
  { label: 'Sueldo', icon: '💰', path: '/(tabs)/commissions' },
  { label: 'Usuarios', icon: '👥', path: '/(tabs)/users', adminOnly: true },
]

export default function TabsLayout() {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) { setUserName(data.full_name); setUserRole(data.role) }
        })
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <View style={styles.container}>
      <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
        {!collapsed && (
          <View style={styles.sidebarTop}>
            <View style={styles.logoRow}>
                {/* @ts-ignore */}
              <img
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMykiIHN0cm9rZS13aWR0aD0iMS41Ii8+CiAgPHBhdGggZD0iTTYuNSAyMiBBMTEgMTEgMCAwIDEgMjUuNSAyMiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNCkiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz4KICA8cGF0aCBkPSJNNi41IDIyIEE5IDkgMCAwIDEgMTQgMTMuNSIgc3Ryb2tlPSIjNEFERTgwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+CiAgPGxpbmUgeDE9IjE2IiB5MT0iMjIiIHgyPSIxMiIgeTI9IjE0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMjIiIHI9IjIuNSIgZmlsbD0id2hpdGUiLz4KICA8bGluZSB4MT0iOS41IiB5MT0iMTkuNSIgeDI9IjExIiB5Mj0iMTkuNSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNSkiIHN0cm9rZS13aWR0aD0iMS4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8bGluZSB4MT0iMjEiIHkxPSIxOS41IiB4Mj0iMjIuNSIgeTI9IjE5LjUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjUpIiBzdHJva2Utd2lkdGg9IjEuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGxpbmUgeDE9IjE2IiB5MT0iMTIiIHgyPSIxNiIgeTI9IjEzLjUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjUpIiBzdHJva2Utd2lkdGg9IjEuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg=="
                style={{ width: 32, height: 32 } as any}
              />
              <Text style={styles.appName}>AutoGestión Pro</Text>
            </View>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        )}

        <View style={styles.nav}>
          {NAV_ITEMS.filter(item => !item.adminOnly || userRole === 'admin').map(item => {
            const isActive = pathname === item.path.replace('/(tabs)', '')
            return (
              <TouchableOpacity
                key={item.path}
                style={[styles.navItem, isActive && styles.navItemActive, collapsed && styles.navItemCollapsed]}
                onPress={() => router.push(item.path as any)}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                {!collapsed && (
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {!collapsed && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        )}

        {collapsed && (
          <TouchableOpacity style={styles.logoutBtnCollapsed} onPress={handleLogout}>
            <Text style={styles.navIcon}>🚪</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Botón toggle pegado al borde del sidebar */}
      <TouchableOpacity
        style={[styles.toggleBtn, { left: (collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W) - 14 }]}
        onPress={() => setCollapsed(c => !c)}
      >
        <Text style={styles.toggleIcon}>{collapsed ? '›' : '‹'}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  )
}

const SIDEBAR_W = 220
const SIDEBAR_COLLAPSED_W = 60

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: Colors.primary,
    paddingVertical: 32,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    transition: 'width 0.25s ease',
  } as any,
  sidebarCollapsed: {
    width: SIDEBAR_COLLAPSED_W,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  sidebarTop: {
    marginBottom: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  userName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  nav: {
    flex: 1,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    gap: 0,
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  navIcon: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  navLabelActive: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  logoutBtnCollapsed: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  toggleBtn: {
    position: 'absolute' as any,
    top: '50%' as any,
    left: SIDEBAR_W - 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transition: 'left 0.25s ease',
  } as any,
  toggleIcon: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    overflow: 'hidden' as any,
  },
})
