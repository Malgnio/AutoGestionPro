import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInvite, setIsInvite] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setIsInvite(true)
      // Supabase parsea automáticamente el token del hash
      supabase.auth.getSession()
    }
  }, [])

  async function handleLogin() {
    if (!email || !password) { setError('Ingresa tu email y contraseña'); return }
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('Credenciales incorrectas')
  }

  async function handleForgotPassword() {
    if (!forgotEmail) { setError('Ingresa tu email'); return }
    setError(''); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: 'https://auto-gestion-pro.vercel.app/login',
    })
    setLoading(false)
    if (error) { setError('Error al enviar el email: ' + error.message) }
    else { setSuccess('Te enviamos un email con el link para restablecer tu contraseña.') }
  }

  async function handleSetPassword() {
    if (!newPassword || !confirmPassword) { setError('Completa ambos campos'); return }
    if (newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden'); return }
    setError(''); setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) { setError('Error al establecer contraseña: ' + error.message) }
    else { setSuccess('¡Contraseña creada! Redirigiendo...') }
  }

  if (showForgot) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>AutoGestión Pro</Text>
          <Text style={styles.subtitle}>Recuperar contraseña</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.successMsg}>{success}</Text> : null}

          {!success && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Tu email de acceso"
                placeholderTextColor={Colors.textLight}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.button} onPress={handleForgotPassword} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Enviar link</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => { setShowForgot(false); setError(''); setSuccess(''); setForgotEmail('') }} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Volver al login</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (isInvite) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>AutoGestión Pro</Text>
          <Text style={styles.subtitle}>Crea tu contraseña de acceso</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.successMsg}>{success}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor={Colors.textLight}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmar contraseña"
            placeholderTextColor={Colors.textLight}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleSetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Crear contraseña</Text>}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>AutoGestión Pro</Text>
        <Text style={styles.subtitle}>Gestión Comercial de Vehículos</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textLight}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={Colors.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setShowForgot(true); setError(''); setForgotEmail(email) }} style={styles.forgotLink}>
          <Text style={styles.forgotLinkText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 48,
    width: 420,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 36,
  },
  error: {
    backgroundColor: '#FDECEA',
    color: Colors.danger,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
    outlineStyle: 'none',
  } as any,
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  successMsg: {
    backgroundColor: '#E8F8EF',
    color: '#1E8449',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  forgotLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotLinkText: {
    fontSize: 13,
    color: Colors.textLight,
    textDecorationLine: 'underline',
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 13,
    color: Colors.textLight,
    textDecorationLine: 'underline',
  },
})
