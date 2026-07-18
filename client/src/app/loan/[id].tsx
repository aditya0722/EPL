import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LoanService, RepaymentService } from '../../api/services';
import { Timeline } from '../../components/Timeline';
import { StatusBadge } from '../../components/StatusBadge';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { IndianRupee, FileText, Calendar, Clock, CreditCard } from 'lucide-react-native';

export default function LoanDetailsScreen() {
  const { id } = useLocalSearchParams();
  const theme = Colors.light;
  const [paying, setPaying] = useState(false);

  const handleMakeRepayment = async () => {
    let amountToPay = 0;
    if (Platform.OS === 'web') {
      const val = window.prompt("Enter amount to repay (INR):", String(repaymentMeta?.outstandingAmount || 0));
      if (val === null) return;
      amountToPay = Number(val);
    } else {
      const confirmAction = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Confirm Repayment',
          `Do you want to repay the outstanding balance of ${formatAmount(repaymentMeta?.outstandingAmount || 0)}?`,
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Repay Full Amount', onPress: () => { amountToPay = Number(repaymentMeta?.outstandingAmount || 0); resolve(true); } }
          ]
        );
      });
      if (!confirmAction) return;
    }

    if (isNaN(amountToPay) || amountToPay <= 0) {
      Alert.alert('Error', 'Please enter a valid positive payment amount.');
      return;
    }

    setPaying(true);
    try {
      await RepaymentService.makeRepayment({
        loanId: loan.id,
        amount: amountToPay,
        paymentMethod: 'upi',
        transactionRef: `TXN-CLIENT-${Date.now()}`,
        remarks: 'Paid directly from customer app',
      });
      Alert.alert('Success', 'Repayment completed successfully!');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to submit payment.');
    } finally {
      setPaying(false);
    }
  };

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['loanDetails', id],
    queryFn: async () => {
      const res = await LoanService.getDetails(id as string);
      return res.data;
    },
    refetchInterval: 15000, // Auto refresh every 15 seconds to pick up admin status changes in real-time
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !response) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.text }]}>Failed to load application details.</Text>
      </View>
    );
  }

  const { loan, repayments = [], repaymentMeta } = response || {};

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amountVal: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amountVal));
  };

  const isRepaymentVisible = ['disbursed', 'closed', 'defaulted'].includes(loan.status);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      >
        {/* Core Loan summary card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Applied Loan Amount</Text>
              <Text style={[styles.amountValue, { color: theme.text }]}>{formatAmount(loan.loanAmount)}</Text>
            </View>
            <StatusBadge status={loan.status} />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.summaryGrid}>
            <View style={styles.gridCol}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Purpose</Text>
              <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={1}>
                {loan.loanPurpose}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Duration</Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>{loan.loanDuration} Months</Text>
            </View>
          </View>

          <View style={[styles.summaryGrid, { marginTop: 12 }]}>
            <View style={styles.gridCol}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Application Date</Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>{formatDate(loan.createdAt)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Monthly Income</Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>{formatAmount(loan.monthlyIncome)}</Text>
            </View>
          </View>
        </View>

        {/* Visual Timeline Tracking */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Application Status Timeline</Text>
        <View style={[styles.timelineCard, { backgroundColor: theme.backgroundElement }]}>
          <Timeline status={loan.status} remarks={loan.adminRemarks} updatedAt={loan.updatedAt} />
        </View>

        {/* Repayment History details (only if disbursed or closed) */}
        {isRepaymentVisible && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Repayment & Outstanding Status</Text>
            <View style={[styles.repayCard, { backgroundColor: theme.backgroundElement }]}>
              
              <View style={styles.repayGrid}>
                <View style={styles.repayCol}>
                  <Text style={[styles.repayLabel, { color: theme.textSecondary }]}>Total Paid</Text>
                  <Text style={[styles.repayValue, { color: theme.success }]}>
                    {formatAmount(repaymentMeta?.totalRepaid || 0)}
                  </Text>
                </View>
                <View style={styles.repayCol}>
                  <Text style={[styles.repayLabel, { color: theme.textSecondary }]}>Remaining Outstanding</Text>
                  <Text style={[styles.repayValue, { color: loan.status === 'closed' ? theme.textSecondary : theme.error }]}>
                    {formatAmount(repaymentMeta?.outstandingAmount || 0)}
                  </Text>
                </View>
              </View>

              {loan.status === 'disbursed' && (
                <Pressable
                  style={[styles.payNowBtn, paying && { opacity: 0.7 }]}
                  onPress={handleMakeRepayment}
                  disabled={paying}
                >
                  {paying ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.payNowBtnText}>Repay Loan (Pay Now)</Text>
                  )}
                </Pressable>
              )}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <Text style={[styles.historyHeader, { color: theme.text }]}>Transaction History</Text>
              
              {repayments.length === 0 ? (
                <Text style={[styles.emptyRepayments, { color: theme.textSecondary }]}>
                  No repayments recorded yet. Ensure you pay the admin directly via UPI/QR.
                </Text>
              ) : (
                repayments.map((repayment: any) => (
                  <View key={repayment.id} style={styles.repaymentRow}>
                    <View style={styles.repaymentInfo}>
                      <CreditCard size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                      <View>
                        <Text style={[styles.repayRowTitle, { color: theme.text }]}>
                          Payment Recorded ({repayment.paymentMethod.toUpperCase()})
                        </Text>
                        <Text style={[styles.repayRowSubtitle, { color: theme.textSecondary }]}>
                          Ref: {repayment.transactionRef} • {formatDate(repayment.paymentDate)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.repayRowAmt, { color: theme.success }]}>
                      + {formatAmount(repayment.amount)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: Spacing.four,
  },
  summaryCard: {
    borderRadius: Brand.borderRadius.xl,
    padding: 20,
    marginBottom: Spacing.four,
    ...Brand.shadowSoft,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
  timelineCard: {
    borderRadius: Brand.borderRadius.xl,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: Spacing.four,
    ...Brand.shadowSoft,
  },
  repayCard: {
    borderRadius: Brand.borderRadius.xl,
    padding: 20,
    marginBottom: Spacing.four,
    ...Brand.shadowSoft,
  },
  repayGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  repayCol: {
    flex: 1,
  },
  repayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  repayValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  historyHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyRepayments: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    paddingVertical: 12,
  },
  repaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  repaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  repayRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  repayRowSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  repayRowAmt: {
    fontSize: 14,
    fontWeight: '800',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
  },
  payNowBtn: {
    backgroundColor: '#1A2980',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
