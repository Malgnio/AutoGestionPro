import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

type Profile = {
  id: string
  full_name: string
  role: 'admin' | 'vendedor'
  created_at: string
  email?: string
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', vendedor: 'Vendedor' }
const ROLE_COLOR: Record<string, string> = { admin: Colors.primary, vendedor: Colors.secondary }

export default function UsersScreen() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'vendedor'>('vendedor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.rpc('get_profiles_with_email')
    setUsers((data ?? []).sort((a: Profile, b: Profile) => b.created_at.localeCompare(a.created_at)))
    setLoading(false)
  }

  async function handleChangeRole(userId: string, newRole: 'admin' | 'vendedor') {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return
    await supabase.from('profiles').delete().eq('id', userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  async function handleInvite() {
    if (!inviteEmail || !inviteName) { setInviteError('Completa todos los campos'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { setInviteError('Email inválido'); return }
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')

    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email: inviteEmail, full_name: inviteName, role: inviteRole }
    })

    setInviting(false)
    if (error) {
      setInviteError('Error al enviar invitación: ' + error.message)
    } else {
      setInviteSuccess(`Invitación enviada a ${inviteEmail}`)
      setInviteEmail(''); setInviteName(''); setInviteRole('vendedor')
      loadUsers()
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Usuarios</Text>
          <Text style={styles.pageSub}>Gestión de acceso a la aplicación</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { setShowInvite(true); setInviteError(''); setInviteSuccess('') }}>
          <Text style={styles.addButtonText}>+ Invitar usuario</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cell, styles.cellName, styles.headCell]}>Nombre</Text>
              <Text style={[styles.cell, styles.cellEmail, styles.headCell]}>Email</Text>
              <Text style={[styles.cell, styles.cellRole, styles.headCell]}>Rol</Text>
              <Text style={[styles.cell, styles.cellDate, styles.headCell]}>Creado</Text>
              <Text style={[styles.cell, styles.cellAction, styles.headCell]}></Text>
            </View>
            {users.map((u, i) => (
              <View key={u.id} style={[styles.tableRow, i % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                <View style={[styles.cell, styles.cellName]}>
                  <Text style={styles.userName}>{u.full_name || '—'}</Text>
                </View>
                <Text style={[styles.cell, styles.cellEmail, { color: Colors.textLight }]}>{u.email || '—'}</Text>
                <View style={[styles.cell, styles.cellRole]}>
                  <TouchableOpacity
                    style={[styles.roleBadge, { backgroundColor: ROLE_COLOR[u.role] ?? Colors.secondary }]}
                    onPress={() => handleChangeRole(u.id, u.role === 'admin' ? 'vendedor' : 'admin')}
                  >
                    <Text style={styles.roleBadgeText}>{ROLE_LABEL[u.role] ?? u.role}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cell, styles.cellDate]}>{formatDate(u.created_at)}</Text>
                <View style={[styles.cell, styles.cellAction]}>
                  <TouchableOpacity onPress={() => handleDelete(u.id, u.full_name)} style={styles.iconBtn}>
                    <Text style={styles.iconDelete}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {showInvite && <View style={styles.overlay} />}

      <View style={[styles.drawer, showInvite && styles.drawerOpen]}>
        <View style={styles.drawerHeader}>
          <View>
            <Text style={styles.drawerTitle}>Invitar usuario</Text>
            <Text style={styles.drawerSub}>Se enviará un email con acceso</Text>
          </View>
          <TouchableOpacity onPress={() => setShowInvite(false)}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerBody}>
          {inviteError ? <Text style={styles.formError}>{inviteError}</Text> : null}
          {inviteSuccess ? <Text style={styles.formSuccess}>{inviteSuccess}</Text> : null}

          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            value={inviteName}
            onChangeText={v => setInviteName(v.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase()))}
            placeholder="Nombre Apellido"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Rol</Text>
          <View style={styles.typeRow}>
            {(['vendedor', 'admin'] as const).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.typeBtn, inviteRole === r && styles.typeBtnActive]}
                onPress={() => setInviteRole(r)}
              >
                <Text style={[styles.typeBtnText, inviteRole === r && styles.typeBtnTextActive]}>
                  {ROLE_LABEL[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowInvite(false)}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleInvite} disabled={inviting}>
            {inviting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>Enviar invitación</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 32, paddingBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  pageSub: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  tableContainer: { flex: 1, paddingHorizontal: 32 },
  table: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  tableHead: { backgroundColor: Colors.primary },
  rowEven: { backgroundColor: Colors.white },
  rowOdd: { backgroundColor: '#F8F9FA' },
  cell: { fontSize: 13, color: Colors.text, paddingHorizontal: 6 },
  headCell: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  cellName: { flex: 1.5 },
  cellEmail: { flex: 2, fontSize: 13 },
  cellRole: { width: 110 },
  cellDate: { flex: 1, color: Colors.textLight, fontSize: 13 },
  cellAction: { width: 48, alignItems: 'flex-end' },
  userName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  roleBadge: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  roleBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: '#F0F3F6' },
  iconDelete: { fontSize: 14 },
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 100 },
  drawer: {
    position: 'fixed' as any, top: 0, right: 0, bottom: 0,
    width: 460, backgroundColor: Colors.white,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    zIndex: 101, transform: [{ translateX: 460 }],
    transition: 'transform 0.3s ease',
  } as any,
  drawerOpen: { transform: [{ translateX: 0 }] },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.border },
  drawerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  drawerSub: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  closeBtn: { fontSize: 18, color: Colors.textLight, padding: 4 },
  drawerBody: { flex: 1, padding: 24 },
  drawerFooter: { flexDirection: 'row', gap: 12, padding: 24, borderTopWidth: 1, borderTopColor: Colors.border },
  formError: { backgroundColor: '#FDECEA', color: Colors.danger, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  formSuccess: { backgroundColor: '#E8F8EF', color: Colors.success, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  label: { fontSize: 13, color: Colors.textLight, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: Colors.text, outlineStyle: 'none' } as any,
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { color: Colors.textLight, fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: Colors.white },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelButtonText: { color: Colors.textLight, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: Colors.white, fontWeight: 'bold' },
})
