import React from 'react';
import { StyleSheet, Text, View, FlatList, RefreshControl, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../api/services';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { BellRing, Calendar, ShieldCheck, HelpCircle, FileText, Ban } from 'lucide-react-native';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

export default function NotificationsScreen() {
  const theme = Colors.light;

  // Retrieve notifications via dashboard data (cached & synchronized)
  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'], // Share query key to reuse cache
    queryFn: async () => {
      const res = await UserService.getDashboard();
      return res.data;
    },
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const notifications = response?.notifications || [];

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'loan_approved':
      case 'kyc_verified':
        return <ShieldCheck size={22} color={theme.success} />;
      case 'loan_rejected':
      case 'document_required':
        return <Ban size={22} color={theme.error} />;
      case 'payment_recorded':
        return <ShieldCheck size={22} color={theme.primary} />;
      case 'support_reply':
      case 'admin_message':
      default:
        return <HelpCircle size={22} color={theme.info} />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.iconContainer}>
        {getIcon(item.type)}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.notifTitle, { color: theme.text }]}>{item.title}</Text>
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.notifMsg, { color: theme.textSecondary }]}>{item.message}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Keep track of updates regarding your KYC status and loan approvals.
        </Text>
      </View>

      {notifications.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BellRing size={48} color={theme.textSecondary + '44'} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Notifications Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Updates on your manual verification calls and disbursements will show up here.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: Platform.OS === 'ios' ? 44 : 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  listContainer: {
    padding: Spacing.four,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    borderRadius: Brand.borderRadius.lg,
    padding: 16,
    marginBottom: Spacing.three,
    ...Brand.shadowSoft,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  notifMsg: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
