import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

type Screen = 'login' | 'register' | 'forgot' | 'reset';

export default function LoginScreen({ navigation }: any) {
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTenant, setRegTenant] = useState('');

  const { signIn, savedAccounts, switchAccount, removeSavedAccount, signOut } = useAuth();
  const { colors } = useTheme();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message || 'Check your credentials');
    } else {
      navigation.replace('Main');
    }
  }

  async function handleSwitchAccount(accEmail: string) {
    setLoading(true);
    await switchAccount(accEmail);
    setLoading(false);
    setShowAccounts(false);
    // AuthContext will set user — navigate to Main on next render
    navigation.replace('Main');
  }

  async function handleRemoveAccount(accEmail: string) {
    Alert.alert('Remove Account', `Remove saved login for ${accEmail}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeSavedAccount(accEmail) },
    ]);
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Error', 'Enter your email address');
      return;
    }
    setLoading(true);
    try {
      const result = await http.forgotPassword(email);
      Alert.alert('Reset Sent', result.message || 'Check your email for reset instructions.');
      setScreen('login');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!regName || !regEmail) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    setLoading(true);
    try {
      // No password is collected: the server mints one and emails it (David's signup model).
      const result = await http.register(regEmail, regName, regTenant);
      await http.setToken(result.token);
      navigation.replace('Main');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!resetToken || !newPassword) {
      Alert.alert('Error', 'Enter both the reset token and new password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await http.resetPassword(resetToken, newPassword);
      Alert.alert('Success', result.message || 'Password has been reset. Sign in.');
      setScreen('login');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (screen === 'register') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('login')}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: 32 }]}>
            You'll get a FunnelSwift account that works on both mobile and web
          </Text>

          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Full Name"
            placeholderTextColor={colors.textMuted}
            value={regName}
            onChangeText={setRegName}
            autoCapitalize="words"
          />

          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={regEmail}
            onChangeText={setRegEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Business Name (optional)"
            placeholderTextColor={colors.textMuted}
            value={regTenant}
            onChangeText={setRegTenant}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (screen === 'forgot') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('login')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: 32 }]}>
          Enter your email and we'll send you a reset link
        </Text>

        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          }]}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => setScreen('reset')}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Already have a reset token? Enter it here
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  if (screen === 'reset') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('login')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>New Password</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: 32 }]}>
          Enter the reset token from your email and a new password
        </Text>

        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          }]}
          placeholder="Reset Token"
          placeholderTextColor={colors.textMuted}
          value={resetToken}
          onChangeText={setResetToken}
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          }]}
          placeholder="New Password"
          placeholderTextColor={colors.textMuted}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, { color: colors.primary }]}>FunnelSwift</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Capture Leads Anywhere</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => setScreen('forgot')}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => setScreen('register')}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Create Account</Text>
          </TouchableOpacity>

          {/* Saved Accounts Switcher */}
          {savedAccounts.length > 0 && (
            <View style={styles.savedAccountsSection}>
              <TouchableOpacity
                style={styles.switcherToggle}
                onPress={() => setShowAccounts(!showAccounts)}
              >
                <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                <Text style={[styles.switcherText, { color: colors.primary }]}>
                  Switch Account ({savedAccounts.length})
                </Text>
                <Ionicons
                  name={showAccounts ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {showAccounts && (
                <View style={[styles.accountsList, { backgroundColor: colors.surface }]}>
                  {savedAccounts.map(acc => (
                    <View key={acc.email} style={styles.accountRow}>
                      <TouchableOpacity
                        style={styles.accountInfo}
                        onPress={() => handleSwitchAccount(acc.email)}
                      >
                        <Ionicons name="person-circle" size={32} color={colors.primary} />
                        <View style={styles.accountDetails}>
                          <Text style={[styles.accountName, { color: colors.text }]}>
                            {acc.name}
                          </Text>
                          <Text style={[styles.accountEmail, { color: colors.textMuted }]}>
                            {acc.email}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveAccount(acc.email)}>
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  backBtn: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 8 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoText: { fontSize: 36, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 8 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  formContainer: { width: '100%' },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  passwordInput: { flex: 1, marginBottom: 0 },
  eyeBtn: { position: 'absolute', right: 14, padding: 8, zIndex: 2 },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 14, fontWeight: '500' },
  savedAccountsSection: { marginTop: 32 },
  switcherToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
  },
  switcherText: { fontSize: 14, fontWeight: '500' },
  accountsList: { borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  accountRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2e3245',
  },
  accountInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountDetails: { flex: 1 },
  accountName: { fontSize: 14, fontWeight: '600' },
  accountEmail: { fontSize: 12, marginTop: 1 },
});
