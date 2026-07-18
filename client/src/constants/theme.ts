/**
 * Premium UI Design tokens for manual loan application.
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F2937', // Near black
    background: '#F9FAFB', // Off-white
    backgroundElement: '#FFFFFF', // Pure white
    backgroundSelected: '#EEF2F6', // Light gray/blue
    textSecondary: '#6B7280', // Medium gray
    primary: '#6366F1', // Indigo
    primaryLight: '#8B5CF6', // Purple
    success: '#10B981', // Emerald
    warning: '#F59E0B', // Amber
    error: '#EF4444', // Red
    info: '#3B82F6', // Blue
    border: '#E5E7EB',
  },
  dark: {
    text: '#F9FAFB',
    background: '#111827',
    backgroundElement: '#1F2937',
    backgroundSelected: '#374151',
    textSecondary: '#9CA3AF',
    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    border: '#374151',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Brand = {
  gradient: ['#4F46E5', '#7C3AED'] as [string, string], // Premium Indigo-Purple
  gradientLight: ['#EEF2FF', '#F5F3FF'] as [string, string],
  shadow: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  shadowSoft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
