import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { Mail, Lock, User, Phone, AlertCircle } from 'lucide-react-native';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const handleRegister = async () => {
    // Compulsory Field Validation
    if (!fullName.trim() || !mobileNumber.trim() || !email.trim() || !password || !confirmPassword) {
      const msg = 'All fields marked with * are compulsory. Please complete all fields.';
      setError(msg);
      if (Platform.OS === 'web') {
        window.alert(`Registration Error ⚠️\n\n${msg}`);
      } else {
        Alert.alert('Compulsory Fields Required ⚠️', msg);
      }
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(mobileNumber)) {
      setError('Invalid mobile number format (e.g. +919999999999)');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
      });
      // AuthGuard redirects automatically
    } catch (err: any) {
      const errMsg = err.friendlyMessage || err.message || 'Registration failed. Email or mobile number may already be registered.';
      setError(errMsg);

      if (Platform.OS === 'web') {
        window.alert(`Registration Failed ❌\n\n${errMsg}`);
      } else {
        Alert.alert('Registration Failed ❌', errMsg, [{ text: 'OK' }]);
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
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sign up to request quick and manual personal loans up to ₹50,000.
          </Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={20} color="#DC2626" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Registration Error ⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </View>
          )}

          <InputField
            label="Full Name *"
            placeholder="John Doe"
            value={fullName}
            onChangeText={(val) => {
              setFullName(val);
              if (error) setError(null);
            }}
            icon={<User size={20} color={theme.textSecondary} />}
          />

          <InputField
            label="Mobile Number *"
            placeholder="+91XXXXXXXXXX"
            keyboardType="phone-pad"
            value={mobileNumber}
            onChangeText={(val) => {
              setMobileNumber(val);
              if (error) setError(null);
            }}
            icon={<Phone size={20} color={theme.textSecondary} />}
          />

          <InputField
            label="Email Address *"
            placeholder="john@example.com"
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
            label="Password *"
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

          <InputField
            label="Confirm Password *"
            placeholder="••••••••"
            secureTextEntry
            isPassword
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              if (error) setError(null);
            }}
            icon={<Lock size={20} color={theme.textSecondary} />}
          />

          <PrimaryButton
            title="Register"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.loginContainer}>
            <Text style={[styles.loginLabel, { color: theme.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.loginLink, { color: theme.primary }]}>Sign In</Text>
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
    marginBottom: Spacing.four,
    alignItems: 'center',
    marginTop: 40,
  },
  logoImage: {
    width: 200,
    height: 120,
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.one,
  },
  form: {
    width: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: Spacing.three,
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
  submitBtn: {
    marginTop: Spacing.three,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
    marginBottom: 40,
  },
  loginLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
