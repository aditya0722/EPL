import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthService } from '../../api/services';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const theme = Colors.light;

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await AuthService.forgotPassword(email);
      setSuccess(true);
      // Wait 2 seconds and redirect to reset-password
      setTimeout(() => {
        router.push({
          pathname: '/(auth)/reset-password',
          params: { email },
        });
      }, 2000);
    } catch (err: any) {
      setError(err.friendlyMessage || 'Unable to process request. Please verify email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter your email address and we'll send you a password reset code.
          </Text>
        </View>

        {success ? (
          <View style={[styles.successBox, { backgroundColor: theme.success + '15' }]}>
            <CheckCircle2 size={32} color={theme.success} style={{ marginBottom: 12 }} />
            <Text style={[styles.successTitle, { color: theme.text }]}>Reset Code Sent!</Text>
            <Text style={[styles.successDesc, { color: theme.textSecondary }]}>
              Check your email for the reset code. Redirecting you to set a new password...
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

            <InputField
              label="Email Address"
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={20} color={theme.textSecondary} />}
            />

            <PrimaryButton
              title="Send Reset Code"
              onPress={handleSubmit}
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
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 10,
    marginBottom: Spacing.four,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    marginBottom: Spacing.five,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
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
