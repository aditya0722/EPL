import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { Colors, Brand } from '../constants/theme';

interface StatusBadgeProps {
  status: string;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const theme = Colors.light;

  const getStatusColors = (): { bg: string; text: string; label: string } => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          bg: theme.warning + '22',
          text: theme.warning,
          label: 'Pending',
        };
      case 'under_review':
        return {
          bg: theme.info + '22',
          text: theme.info,
          label: 'Under Review',
        };
      case 'documents_required':
        return {
          bg: theme.primaryLight + '22',
          text: theme.primaryLight,
          label: 'Action Needed',
        };
      case 'approved':
        return {
          bg: theme.success + '22',
          text: theme.success,
          label: 'Approved',
        };
      case 'disbursed':
        return {
          bg: theme.primary + '22',
          text: theme.primary,
          label: 'Active / Disbursed',
        };
      case 'closed':
        return {
          bg: '#10B98122',
          text: '#10B981',
          label: 'Closed / Paid',
        };
      case 'rejected':
        return {
          bg: theme.error + '22',
          text: theme.error,
          label: 'Rejected',
        };
      case 'defaulted':
        return {
          bg: theme.error + '22',
          text: theme.error,
          label: 'Overdue',
        };
      case 'submitted':
        return {
          bg: theme.info + '22',
          text: theme.info,
          label: 'Submitted',
        };
      case 'verified':
        return {
          bg: theme.success + '22',
          text: theme.success,
          label: 'Verified',
        };
      default:
        return {
          bg: theme.border,
          text: theme.textSecondary,
          label: status.toUpperCase(),
        };
    }
  };

  const { bg, text, label } = getStatusColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Brand.borderRadius.round,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
