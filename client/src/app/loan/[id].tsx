import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LoanService, RepaymentService } from '../../api/services';
import { Timeline } from '../../components/Timeline';
import { StatusBadge } from '../../components/StatusBadge';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { IndianRupee, FileText, Calendar, Clock, CreditCard, CheckCircle2, Info, ArrowLeft } from 'lucide-react-native';

export default function LoanDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = Colors.light;
  const [paying, setPaying] = useState(false);

  const formatAmount = (amountVal: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amountVal));
  };

  // 1. Fetch live loan details
  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['loanDetails', id],
    queryFn: async () => {
      const res = await LoanService.getDetails(id as string);
      return res.data;
    },
    refetchInterval: 15000,
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

  // 2. Dynamic fallback calculations for legacy/null database records
  const loanAmount = Number(loan?.loanAmount || 0);
  const totalPayable = Number(loan?.totalPayable) || (loan?.repaymentType === 'emi' ? Math.round(loanAmount * 1.4) : Math.round(loanAmount * 1.08));
  const totalRepaid = Number(repaymentMeta?.totalRepaid || 0);
  const outstandingAmount = loan?.status === 'closed' ? 0 : Math.max(0, totalPayable - totalRepaid);

  // 3. Trigger manual client repayment
  const handleMakeRepayment = async () => {
    const duration = loan?.loanDuration || 3;
    const installmentAmount = Math.round(totalPayable / duration) || 1;
    const amountToPay = loan?.repaymentType === 'emi' ? Math.min(installmentAmount, outstandingAmount) : outstandingAmount;

    if (amountToPay <= 0) {
      Alert.alert('Info', 'Your loan has already been fully repaid.');
      return;
    }

    const confirmMessage = loan?.repaymentType === 'emi'
      ? `Do you want to pay the monthly installment amount of ${formatAmount(amountToPay)}?`
      : `Do you want to pay the outstanding balance of ${formatAmount(amountToPay)}?`;

    const confirmAction = await new Promise<boolean>((resolve) => {
      if (Platform.OS === 'web') {
        const ok = window.confirm(confirmMessage);
        resolve(ok);
      } else {
        Alert.alert(
          'Confirm Repayment',
          confirmMessage,
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Confirm & Pay', onPress: () => resolve(true) }
          ]
        );
      }
    });

    if (!confirmAction) return;

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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isRepaymentVisible = ['disbursed', 'closed', 'defaulted'].includes(loan.status);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER WITH BACK BUTTON */}
      <View style={styles.headerBar}>
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }} 
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Application Timeline</Text>
        <View style={{ width: 40 }} />
      </View>

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
                    {formatAmount(outstandingAmount)}
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

              {/* Dynamic Repayment Schedule Breakdown (EMI or Normal) */}
              {loan.repaymentType === 'emi' && (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 12 }}>EMI Monthly Breakdown</Text>
                  {(() => {
                    const duration = loan.loanDuration || 3;
                    const installmentAmount = Math.round(totalPayable / duration) || 1;

                    return Array.from({ length: duration }).map((_, idx) => {
                      const monthNum = idx + 1;
                      const requiredByThisMonth = installmentAmount * monthNum;
                      
                      // Calculate how much has been paid specifically towards this month's installment
                      let paidForThisMonth = 0;
                      if (totalRepaid >= requiredByThisMonth) {
                        paidForThisMonth = installmentAmount;
                      } else if (totalRepaid > installmentAmount * idx) {
                        paidForThisMonth = totalRepaid - (installmentAmount * idx);
                      }

                      const remainingForThisMonth = installmentAmount - paidForThisMonth;
                      const progress = paidForThisMonth / installmentAmount;

                      // Status styles
                      let statusText = 'Pending';
                      let statusColor = '#64748B'; // slate
                      let progressColor = '#E2E8F0';
                      let icon = <Clock size={16} color="#64748B" />;

                      if (paidForThisMonth === installmentAmount) {
                        statusText = 'Paid';
                        statusColor = '#10B981'; // green
                        progressColor = '#10B981';
                        icon = <CheckCircle2 size={16} color="#10B981" />;
                      } else if (paidForThisMonth > 0) {
                        statusText = `Partially Paid (₹${remainingForThisMonth.toLocaleString('en-IN')} remaining)`;
                        statusColor = '#F59E0B'; // orange
                        progressColor = '#F59E0B';
                        icon = <Info size={16} color="#F59E0B" />;
                      }

                      return (
                        <View key={idx} style={{ marginBottom: 14 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {icon}
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginLeft: 8 }}>
                                Month {monthNum} Installment
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor }}>
                              {statusText}
                            </Text>
                          </View>

                          {/* Progress bar */}
                          <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                            <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: progressColor, borderRadius: 3 }} />
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                              Paid: {formatAmount(paidForThisMonth)} / {formatAmount(installmentAmount)}
                            </Text>
                            {paidForThisMonth > 0 && paidForThisMonth < installmentAmount && (
                              <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                                {Math.round(progress * 100)}%
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    });
                  })()}
                </View>
              )}

              {loan.repaymentType !== 'emi' && (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 12 }}>Repayment Progress</Text>
                  {(() => {
                    const totalPayable = Number(loan.totalPayable || 0);
                    const totalRepaid = Number(repaymentMeta?.totalRepaid || 0);
                    const progress = Math.min(1, totalRepaid / totalPayable);

                    return (
                      <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>
                            One-time Payment at end of {loan.loanDuration} Months
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: totalRepaid === totalPayable ? '#10B981' : '#4F46E5' }}>
                            {totalRepaid === totalPayable ? 'Fully Paid' : `${Math.round(progress * 100)}% Repaid`}
                          </Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                          <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: '#4F46E5', borderRadius: 3 }} />
                        </View>
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                          Paid: {formatAmount(totalRepaid)} / {formatAmount(totalPayable)}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    height: Platform.OS === 'ios' ? 90 : 66,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
