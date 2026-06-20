import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Slot, useRouter, usePathname } from 'expo-router'
import { Colors } from '../../constants/colors'
import { supabase } from '../../lib/supabase'

const NAV_ITEMS = [
  { label: 'Resumen', icon: '📊', path: '/(tabs)/dashboard' },
  { label: 'Ventas', icon: '🚗', path: '/(tabs)/sales' },
  { label: 'Créditos', icon: '💳', path: '/(tabs)/credits' },
  { label: 'Comisiones', icon: '💰', path: '/(tabs)/commissions' },
]

export default function TabsLayout() {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => { if (data) setUserName(data.full_name) })
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarTop}>
          <Text style={styles.appName}>AutoGestión Pro</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>

        <View style={styles.nav}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.path.replace('/(tabs)', '')
            return (
              <TouchableOpacity
                key={item.path}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => router.push(item.path as any)}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  sidebar: {
    width: 220,
    backgroundColor: Colors.primary,
    paddingVertical: 32,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  sidebarTop: {
    marginBottom: 40,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 6,
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
  logoutText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
})
