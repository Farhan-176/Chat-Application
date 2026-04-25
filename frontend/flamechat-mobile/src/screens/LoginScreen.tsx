import React, { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAuthContext } from '../context/AuthContext'

export function LoginScreen() {
  const { signIn, register, signInWithGoogle } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter both email and password.')
      return
    }
    setLoading(true)
    try {
      if (isRegisterMode) {
        await register(email.trim(), password)
      } else {
        await signIn(email.trim(), password)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.'
      Alert.alert('Authentication error', message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.'
      Alert.alert('Google sign-in error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FlameChat Mobile</Text>
      <Text style={styles.subtitle}>Real-time team conversations from anywhere.</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      <Pressable style={[styles.primaryButton, loading && styles.disabled]} onPress={submit} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? 'Please wait...' : isRegisterMode ? 'Create account' : 'Sign in'}</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.line} />
      </View>

      <Pressable style={[styles.googleButton, loading && styles.disabled]} onPress={handleGoogleSignIn} disabled={loading}>
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </Pressable>

      <Pressable onPress={() => setIsRegisterMode((v) => !v)} disabled={loading}>
        <Text style={styles.switchText}>
          {isRegisterMode ? 'Already have an account? Sign in' : 'Need an account? Register'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginBottom: 8,
    color: '#334155',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  switchText: {
    color: '#0369a1',
    textAlign: 'center',
    marginTop: 8,
  },
})