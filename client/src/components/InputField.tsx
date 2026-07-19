import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TextInputProps,
  Pressable,
  Platform,
} from 'react-native';
import { Colors, Brand, Spacing } from '../constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  icon,
  isPassword = false,
  secureTextEntry,
  style,
  onBlur,
  onFocus,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);
  const theme = Colors.light; // Defaulting to light theme

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const isPasswordInput = isPassword || secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: error ? theme.error : theme.textSecondary }]}>{label}</Text>
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error
              ? theme.error
              : isFocused
              ? theme.primary
              : theme.border,
            borderWidth: isFocused || error ? 1.5 : 1,
            borderRadius: Brand.borderRadius.lg,
          },
        ]}
      >
        {icon && <View style={styles.leftIcon}>{icon}</View>}

        <TextInput
          style={[
            styles.input,
            { color: theme.text },
            style,
          ]}
          placeholderTextColor={theme.textSecondary + '77'}
          secureTextEntry={isPasswordInput && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {isPasswordInput && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
          >
            {showPassword ? (
              <EyeOff size={20} color={theme.textSecondary} />
            ) : (
              <Eye size={20} color={theme.textSecondary} />
            )}
          </Pressable>
        )}
      </View>

      {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.one,
    marginLeft: Spacing.one,
  },
  inputContainer: {
    height: 54, // Comfortable touch size
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  leftIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0, // Reset default padding in Android
  },
  rightIcon: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: Spacing.one,
    marginLeft: Spacing.one,
  },
});
