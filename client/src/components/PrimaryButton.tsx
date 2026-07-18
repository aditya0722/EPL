import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Brand } from '../constants/theme';

interface PrimaryButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'gradient' | 'outline' | 'danger';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'gradient',
  icon,
  style,
  textStyle,
}) => {
  const isDark = false; // Add context theme check if required
  const theme = Colors[isDark ? 'dark' : 'light'];

  const getButtonStyles = (pressed: boolean): ViewStyle[] => {
    const base: ViewStyle = {
      opacity: disabled || loading ? 0.6 : pressed ? 0.9 : 1,
      transform: [{ scale: pressed && !disabled && !loading ? 0.98 : 1 }],
    };
    return [base];
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'outline' ? theme.primary : '#FFFFFF'}
          style={styles.spinner}
        />
      ) : (
        icon && <React.Fragment>{icon}</React.Fragment>
      )}
      <Text
        style={[
          styles.text,
          {
            color:
              variant === 'secondary'
                ? theme.primary
                : variant === 'outline'
                ? theme.text
                : '#FFFFFF',
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </>
  );

  if (variant === 'gradient' && !disabled && !loading) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [...getButtonStyles(pressed), styles.pressable, style]}
      >
        <LinearGradient
          colors={Brand.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, { borderRadius: Brand.borderRadius.xl }]}
        >
          {renderContent()}
        </LinearGradient>
      </Pressable>
    );
  }

  // Fallback for other variants (primary, secondary, outline, danger)
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return '#000000'; // Black buttons per the user's mock images!
      case 'secondary':
        return theme.backgroundSelected;
      case 'danger':
        return theme.error;
      case 'outline':
      default:
        return 'transparent';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        ...getButtonStyles(pressed),
        styles.pressable,
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === 'outline' ? theme.border : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderRadius: Brand.borderRadius.xl,
        },
        style,
      ]}
    >
      {renderContent()}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  container: {
    height: 56, // Large touch targets
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  spinner: {
    marginRight: 8,
  },
});
