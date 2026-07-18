import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthService } from '../../api/services';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { Lock, Hash, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState((params.email as string) || '');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const theme = Colors.light;

  const handleReset = async () => {
    if (!email || !token || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await AuthService.resetPassword({
        email,
        token,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (err: any) {
      setError(err.friendlyMessage || 'Invalid or expired reset code. Please try again.');
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
          <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter the code sent to your email and your new password.
          </Text>
        </View>

        {success ? (
          <View style={[styles.successBox, { backgroundColor: theme.success + '15' }]}>
            <CheckCircle2 size={32} color={theme.success} style={{ marginBottom: 12 }} />
            <Text style={[styles.successTitle, { color: theme.text }]}>Password Changed!</Text>
            <Text style={[styles.successDesc, { color: theme.textSecondary }]}>
              Your password has been successfully reset. Redirecting you to login...
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.error + '15' }]}>
                <AlertCircle size={18} color={theme.error} style={{ marginRight: 8 }} />
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              </View>
            )}

            {!params.email && (
              <InputField
                label="Email Address"
                placeholder="john@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            )}

            <InputField
              label="Reset Code (OTP)"
              placeholder="Enter OTP / Code"
              value={token}
              onChangeText={setToken}
              icon={<Hash size={20} color={theme.textSecondary} />}
            />

            <InputField
              label="New Password"
              placeholder="••••••••"
              secureTextEntry
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
              icon={<Lock size={20} color={theme.textSecondary} />}
            />

            <InputField
              label="Confirm New Password"
              placeholder="••••••••"
              secureTextEntry
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              icon={<Lock size={20} color={theme.textSecondary} />}
            />

            <PrimaryButton
              title="Reset Password"
              onPress={handleReset}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        )}
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
    marginTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
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
  successBox: {
    padding: 24,
    borderRadius: Brand.borderRadius.lg,
    alignItems: 'center',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  submitBtn: {
    marginTop: Spacing.three,
  },
});
