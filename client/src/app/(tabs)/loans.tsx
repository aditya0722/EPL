import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../api/services';
import { StatusBadge } from '../../components/StatusBadge';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { FileText, Calendar, Clock, ArrowRight, Coins, CreditCard } from 'lucide-react-native';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

export default function LoansScreen() {
  const router = useRouter();
  const theme = Colors.light;
  const [activeSubTab, setActiveSubTab] = useState<'loans' | 'payments'>('loans');

  // Fetch live loan & repayment history through dashboard
  const { data: dashboardData, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
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

  if (isError || !dashboardData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text, fontSize: 16 }}>Failed to load history.</Text>
        <Pressable onPress={onRefresh} style={{ marginTop: 12, padding: 8, backgroundColor: theme.primary, borderRadius: 8 }}>
          <Text style={{ color: '#FFF' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const loansList = dashboardData.loanHistory || [];
  const paymentsList = dashboardData.repaymentHistory || [];

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amtStr: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amtStr));
  };

  const renderLoanItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`/loan/${item.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.amountText, { color: theme.text }]}>{formatAmount(item.loanAmount)}</Text>
          <Text style={[styles.purposeText, { color: theme.textSecondary }]}>{item.loanPurpose}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Calendar size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            Applied: {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            Duration: {item.loanDuration} Months
          </Text>
        </View>
      </View>

      <View style={styles.arrowRow}>
        <Text style={[styles.actionLink, { color: theme.primary }]}>View Timeline</Text>
        <ArrowRight size={14} color={theme.primary} />
      </View>
    </Pressable>
  );

  const renderPaymentItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.paymentIconBox}>
            <CreditCard size={18} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.amountText, { color: theme.text, fontSize: 18 }]}>{formatAmount(item.amount)}</Text>
            <Text style={[styles.purposeText, { color: theme.textSecondary }]}>
              Method: {item.paymentMethod.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, styles.badge_success]}>
          <Text style={styles.badgeText}>PAID</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Calendar size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            Paid: {formatDate(item.paymentDate)}
          </Text>
        </View>
      </View>
      
      <View style={styles.refBox}>
        <Text style={styles.refText}>Ref No: {item.transactionRef}</Text>
        {item.remarks && <Text style={styles.remarksText}>{item.remarks}</Text>}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My History</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          View all your current and past personal loans and payments.
        </Text>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeSubTab === 'loans' && styles.activeTab]}
            onPress={() => setActiveSubTab('loans')}
          >
            <Text style={[styles.tabText, activeSubTab === 'loans' && styles.activeTabText]}>Loans</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeSubTab === 'payments' && styles.activeTab]}
            onPress={() => setActiveSubTab('payments')}
          >
            <Text style={[styles.tabText, activeSubTab === 'payments' && styles.activeTabText]}>Repayments</Text>
          </Pressable>
        </View>
      </View>

      {activeSubTab === 'loans' ? (
        loansList.length === 0 ? (
          <FlatList
            data={[]}
            renderItem={null}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FileText size={48} color={theme.textSecondary + '55'} style={{ marginBottom: 16 }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Applications Yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Any personal loans you apply for will show up here.
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={loansList}
            keyExtractor={(item) => item.id}
            renderItem={renderLoanItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
          />
        )
      ) : (
        paymentsList.length === 0 ? (
          <FlatList
            data={[]}
            renderItem={null}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Coins size={48} color={theme.textSecondary + '55'} style={{ marginBottom: 16 }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Repayments Logged</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  All logged repayment payments will show up here.
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={paymentsList}
            keyExtractor={(item) => item.id}
            renderItem={renderPaymentItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
          />
        )
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
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#1A2980',
  },
  listContainer: {
    padding: Spacing.four,
    paddingBottom: 40,
  },
  card: {
    borderRadius: Brand.borderRadius.lg,
    padding: 16,
    marginBottom: Spacing.three,
    backgroundColor: '#FFFFFF',
    ...Brand.shadowSoft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountText: {
    fontSize: 20,
    fontWeight: '800',
  },
  purposeText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionLink: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  paymentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badge_success: {
    backgroundColor: '#D1FAE5',
  },
  badgeText_success: {
    color: '#059669',
  },
  refBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  refText: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  remarksText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
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
