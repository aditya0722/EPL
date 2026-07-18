import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { Mail, Lock, AlertCircle } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      // Auth guard in root layout will automatically redirect to tabs
    } catch (err: any) {
      setError(err.friendlyMessage || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.header}>
          <Text style={[styles.brand, { color: theme.primary }]}>EasyPezyCash</Text>
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Log in to manage your active loans and repayments.
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {error && (
            <View style={[styles.errorBox, { backgroundColor: theme.error + '15' }]}>
              <AlertCircle size={18} color={theme.error} style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            </View>
          )}

          <InputField
            label="Email Address"
            placeholder="enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={20} color={theme.textSecondary} />}
          />

          <InputField
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            isPassword
            value={password}
            onChangeText={setPassword}
            icon={<Lock size={20} color={theme.textSecondary} />}
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotBtn}
          >
            <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot Password?</Text>
          </Pressable>

          <PrimaryButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.registerContainer}>
            <Text style={[styles.registerLabel, { color: theme.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.registerLink, { color: theme.primary }]}>Sign Up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: Spacing.five,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.five,
    alignItems: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.two,
  },
  form: {
    width: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Brand.borderRadius.md,
    marginBottom: Spacing.three,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.four,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: Spacing.two,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  registerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
