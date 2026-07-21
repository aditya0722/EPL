import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
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
      const msg = 'Please enter both your email address and password.';
      setError(msg);
      if (Platform.OS === 'web') {
        window.alert(`Input Required\n\n${msg}`);
      } else {
        Alert.alert('Input Required', msg);
      }
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const failureReason = err.friendlyMessage || err.response?.data?.message || 'Invalid email address or password. Please check your credentials and try again.';
      setError(failureReason);

      if (Platform.OS === 'web') {
        window.alert(`Login Failed ❌\n\n${failureReason}`);
      } else {
        Alert.alert(
          'Login Failed ❌',
          failureReason,
          [{ text: 'Try Again' }]
        );
      }
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
          <Image
            source={require('../../../assets/images/logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Log in to manage your active loans and repayments.
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={20} color="#DC2626" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Invalid Credentials</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </View>
          )}

          <InputField
            label="Email Address"
            placeholder="enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (error) setError(null);
            }}
            icon={<Mail size={20} color={theme.textSecondary} />}
          />

          <InputField
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            isPassword
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (error) setError(null);
            }}
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
  logoImage: {
    width: 200,
    height: 120,
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
    padding: 14,
    borderRadius: 12,
    marginBottom: Spacing.four,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    lineHeight: 16,
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
