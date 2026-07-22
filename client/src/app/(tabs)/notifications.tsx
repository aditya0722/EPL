import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Dimensions, RefreshControl, FlatList } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { AdminService, UserService } from '../../api/services';
import { Colors, Spacing, Brand } from '../../constants/theme';
import { 
  CreditCard, CheckCircle2, XCircle, Search, Wallet, Landmark, Banknote, MoreHorizontal, 
  AlertCircle, Coins, X, ChevronRight, BellRing, BellCheck, Bell, Ban, HelpCircle, ShieldCheck, Info
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

export default function NotificationsOrPaymentsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (isAdmin) {
    return <AdminPaymentsHub />;
  }

  return <UserNotificationsScreen />;
}

function AdminPaymentsHub() {
  const theme = Colors.light;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [pendingRepayments, setPendingRepayments] = useState<any[]>([]);
  const [allRepayments, setAllRepayments] = useState<any[]>([]);
  
  const [paymentsSubTab, setPaymentsSubTab] = useState<'pending' | 'history'>('pending');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Load Pending Repayments
  const loadPendingRepayments = async () => {
    setLoading(true);
    try {
      const res = await AdminService.getPendingRepayments();
      setPendingRepayments(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load All Repayments (History)
  const loadAllRepayments = async () => {
    setLoading(true);
    try {
      const res = await AdminService.getRepayments();
      setAllRepayments(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.all([loadPendingRepayments(), loadAllRepayments()]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Verify Repayment (Approved/Failed)
  const handleVerifyRepayment = async (repayId: string, status: 'completed' | 'failed') => {
    let remarksText = '';
    if (Platform.OS === 'web') {
      if (status === 'failed') {
        const val = window.prompt('Enter rejection remarks:');
        if (val === null) return;
        remarksText = val;
      } else {
        const confirmAction = window.confirm('Are you sure you want to APPROVE this manual repayment?');
        if (!confirmAction) return;
        remarksText = 'Approved by admin';
      }
    } else {
      if (status === 'failed') {
        const confirm = await new Promise<string | null>((resolve) => {
          Alert.prompt(
            'Reject Repayment',
            'Enter rejection remarks:',
            [
              { text: 'Cancel', onPress: () => resolve(null), style: 'cancel' },
              { text: 'Reject', onPress: (val?: string) => resolve(val || 'Rejected by admin'), style: 'destructive' }
            ],
            'plain-text'
          );
        });
        if (confirm === null) return;
        remarksText = confirm;
      } else {
        const confirm = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Approve Repayment',
            'Are you sure you want to APPROVE this manual repayment?',
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Approve', onPress: () => resolve(true) }
            ]
          );
        });
        if (!confirm) return;
        remarksText = 'Approved by admin';
      }
    }

    setLoading(true);
    try {
      await AdminService.verifyRepayment(repayId, status, remarksText);
      Alert.alert('Success', `Repayment has been ${status === 'completed' ? 'approved' : 'rejected'}.`);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to verify repayment.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Filtered payments history
  const filteredAllRepayments = useMemo(() => {
    return allRepayments.filter((item) => {
      const { repayment, user: client } = item;
      if (paymentStatusFilter !== 'all' && repayment.status !== paymentStatusFilter) return false;
      if (paymentSearchQuery.trim().length > 0) {
        const q = paymentSearchQuery.toLowerCase();
        return (
          client.fullName?.toLowerCase().includes(q) ||
          client.mobileNumber?.includes(q) ||
          repayment.transactionRef?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allRepayments, paymentStatusFilter, paymentSearchQuery]);

  // Payment history metrics
  const repaymentStats = useMemo(() => {
    let totalCollected = 0;
    let pendingVerification = 0;
    let failedCount = 0;

    allRepayments.forEach((item) => {
      const { repayment } = item;
      const amt = Number(repayment.amount || 0);
      if (repayment.status === 'completed') {
        totalCollected += amt;
      } else if (repayment.status === 'pending') {
        pendingVerification += amt;
      } else if (repayment.status === 'failed') {
        failedCount += 1;
      }
    });

    return { totalCollected, pendingVerification, failedCount };
  }, [allRepayments]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: '#F8FAFC' }]}
    >
      {/* COMPACT HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CreditCard size={20} color="#4F46E5" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Payments Hub</Text>
        </View>
        <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
          <MoreHorizontal size={18} color="#64748B" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
        }
      >
        {/* Sub Tabs Segmented Control */}
        <View style={styles.subTabBar}>
          <Pressable
            style={[styles.subTabItem, paymentsSubTab === 'pending' && styles.subTabItemActive]}
            onPress={() => setPaymentsSubTab('pending')}
          >
            <Text style={[styles.subTabText, paymentsSubTab === 'pending' && styles.subTabTextActive]}>
              Queue ({pendingRepayments.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.subTabItem, paymentsSubTab === 'history' && styles.subTabItemActive]}
            onPress={() => setPaymentsSubTab('history')}
          >
            <Text style={[styles.subTabText, paymentsSubTab === 'history' && styles.subTabTextActive]}>
              History ({allRepayments.length})
            </Text>
          </Pressable>
        </View>

        {paymentsSubTab === 'pending' ? (
          // Verification Queue
          <View>
            {pendingRepayments.length > 0 && (
              <View style={[styles.summaryBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', marginBottom: 12 }]}>
                <CreditCard size={18} color="#059669" style={{ marginRight: 10 }} />
                <Text style={[styles.summaryBannerText, { color: '#065F46' }]}>
                  <Text style={{ fontWeight: '800' }}>{pendingRepayments.length}</Text> payment{pendingRepayments.length > 1 ? 's' : ''} awaiting verification
                </Text>
              </View>
            )}

            {loading && pendingRepayments.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading payments...</Text>
              </View>
            ) : pendingRepayments.length === 0 ? (
              <View style={styles.emptyState}>
                <CheckCircle2 size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptyDesc}>No pending repayments to verify.</Text>
              </View>
            ) : (
              pendingRepayments.map((item) => {
                const { repayment, user: client, loan } = item;
                const dateStr = new Date(repayment.paymentDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <View key={repayment.id} style={styles.paymentCard}>
                    {/* Client Info */}
                    <View style={styles.paymentCardHeader}>
                      <View style={styles.paymentAvatarCircle}>
                        <Text style={styles.paymentAvatarText}>{getInitials(client.fullName)}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.paymentClientName}>{client.fullName}</Text>
                        <Text style={styles.paymentClientMeta}>{client.email} • {client.mobileNumber}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>PENDING</Text>
                      </View>
                    </View>

                    {/* Amount Highlight */}
                    <View style={styles.paymentAmountCard}>
                      <View>
                        <Text style={styles.paymentAmountLabel}>Amount Paid</Text>
                        <Text style={styles.paymentAmountValue}>{formatCurrency(repayment.amount)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.paymentAmountLabel}>Payment Date</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>{dateStr}</Text>
                      </View>
                    </View>

                    {/* Payment Details */}
                    <View style={styles.paymentDetailsBox}>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>UTR / Txn Ref</Text>
                        <Text style={styles.paymentDetailValue}>{repayment.transactionRef}</Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Payment Method</Text>
                        <Text style={styles.paymentDetailValue}>{repayment.paymentMethod.toUpperCase().replace('_', ' ')}</Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Loan Purpose</Text>
                        <Text style={styles.paymentDetailValue}>{loan.loanPurpose} ({formatCurrency(loan.loanAmount)})</Text>
                      </View>
                      {repayment.remarks && (
                        <View style={styles.paymentDetailRow}>
                          <Text style={styles.paymentDetailLabel}>User Remarks</Text>
                          <Text style={[styles.paymentDetailValue, { fontStyle: 'italic' }]}>{repayment.remarks}</Text>
                        </View>
                      )}
                    </View>

                    {/* Receipt Screenshot */}
                    {repayment.screenshotUrl ? (
                      <View style={styles.receiptContainer}>
                        <Text style={styles.receiptLabel}>Uploaded Receipt</Text>
                        <View style={styles.receiptFrame}>
                          <Image
                            source={{ uri: repayment.screenshotUrl }}
                            style={styles.receiptImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.noReceiptBox}>
                        <AlertCircle size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                        <Text style={styles.noReceiptText}>No receipt screenshot uploaded</Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleVerifyRepayment(repayment.id, 'completed')}
                      >
                        <CheckCircle2 size={15} color="#FFF" style={{ marginRight: 5 }} />
                        <Text style={styles.actionBtnText}>Approve Payment</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleVerifyRepayment(repayment.id, 'failed')}
                      >
                        <XCircle size={15} color="#FFF" style={{ marginRight: 5 }} />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          // Transaction History
          <View>
            {/* Collections Dashboard Widget */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Collections</Text>
                <Text style={[styles.metricValue, { color: '#10B981' }]}>
                  {formatCurrency(repaymentStats.totalCollected)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Pending Verification</Text>
                <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                  {formatCurrency(repaymentStats.pendingVerification)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Rejected Payments</Text>
                <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                  {repaymentStats.failedCount} Txns
                </Text>
              </View>
            </View>

            {/* Search History */}
            <View style={[styles.searchContainer, { marginBottom: 12 }]}>
              <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search by name, phone, or UTR..."
                value={paymentSearchQuery}
                onChangeText={setPaymentSearchQuery}
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              {paymentSearchQuery.length > 0 && (
                <Pressable onPress={() => setPaymentSearchQuery('')}>
                  <X size={16} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
              {(['all', 'completed', 'pending', 'failed'] as const).map((filter) => {
                const isActive = paymentStatusFilter === filter;
                const labels: Record<string, string> = {
                  all: 'All Statuses',
                  completed: 'Completed',
                  pending: 'Pending',
                  failed: 'Rejected'
                };
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setPaymentStatusFilter(filter)}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {labels[filter]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {loading && allRepayments.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading payments history...</Text>
              </View>
            ) : filteredAllRepayments.length === 0 ? (
              <View style={styles.emptyState}>
                <Coins size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Payments Found</Text>
                <Text style={styles.emptyDesc}>Try adjusting your search query or status filter.</Text>
              </View>
            ) : (
              filteredAllRepayments.map((item) => {
                const { repayment, user: client, loan } = item;
                const isExpanded = expandedPaymentId === repayment.id;
                const dateStr = new Date(repayment.paymentDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                const timeStr = new Date(repayment.paymentDate).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                // Set icon/bg by status
                let statusBg = '#DEF7EC'; // completed green
                let statusColor = '#03543F';
                let avatarBg = '#E0F2FE'; // light blue
                let avatarIconColor = '#0284C7';

                if (repayment.status === 'pending') {
                  statusBg = '#FEF3C7'; // pending yellow
                  statusColor = '#D97706';
                  avatarBg = '#FFFBEB'; // light yellow
                  avatarIconColor = '#D97706';
                } else if (repayment.status === 'failed') {
                  statusBg = '#FDE8E8'; // rejected red
                  statusColor = '#9B1C1C';
                  avatarBg = '#FDF2F2'; // light red
                  avatarIconColor = '#EF4444';
                }

                return (
                  <Pressable
                    key={repayment.id}
                    style={[styles.paymentCard, { paddingVertical: 14 }]}
                    onPress={() => setExpandedPaymentId(isExpanded ? null : repayment.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* Method-based Avatar */}
                      <View style={[styles.loanAvatarCircle, { backgroundColor: avatarBg }]}>
                        {repayment.paymentMethod === 'upi' ? (
                          <Wallet size={18} color={avatarIconColor} />
                        ) : repayment.paymentMethod === 'bank_transfer' ? (
                          <Landmark size={18} color={avatarIconColor} />
                        ) : repayment.paymentMethod === 'cash' ? (
                          <Banknote size={18} color={avatarIconColor} />
                        ) : (
                          <CreditCard size={18} color={avatarIconColor} />
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.loanClientName} numberOfLines={1}>{client.fullName}</Text>
                        <Text style={styles.loanClientPhone}>{dateStr} • {timeStr}</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.loanAmountCompact, { color: repayment.status === 'completed' ? '#10B981' : '#1E293B', marginBottom: 2 }]}>
                          {repayment.status === 'completed' ? '+' : ''} {formatCurrency(repayment.amount)}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusBg, paddingHorizontal: 6, paddingVertical: 2 }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor, fontSize: 8 }]}>
                            {repayment.status === 'completed' ? 'SUCCESS' : repayment.status === 'failed' ? 'REJECTED' : 'PENDING'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Collapsible details for history list */}
                    {isExpanded && (
                      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                          <View style={{ width: '45%' }}>
                            <Text style={styles.detailLabel}>UTR / transaction id</Text>
                            <Text style={[styles.detailValue, { fontSize: 11 }]}>{repayment.transactionRef || 'N/A'}</Text>
                          </View>
                          <View style={{ width: '45%' }}>
                            <Text style={styles.detailLabel}>payment method</Text>
                            <Text style={styles.detailValue}>{repayment.paymentMethod.toUpperCase().replace('_', ' ')}</Text>
                          </View>
                          <View style={{ width: '45%' }}>
                            <Text style={styles.detailLabel}>associated loan</Text>
                            <Text style={[styles.detailValue, { fontSize: 11 }]}>{loan.loanPurpose} ({formatCurrency(loan.loanAmount)})</Text>
                          </View>
                          <View style={{ width: '45%' }}>
                            <Text style={styles.detailLabel}>client contact</Text>
                            <Text style={styles.detailValue}>{client.mobileNumber}</Text>
                          </View>
                        </View>

                        {repayment.remarks && (
                          <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginTop: 4 }}>
                            <Text style={styles.detailLabel}>remarks / audit log</Text>
                            <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{repayment.remarks}</Text>
                          </View>
                        )}

                        {/* View Screenshot option */}
                        {repayment.screenshotUrl && (
                          <View style={{ marginTop: 10 }}>
                            <Text style={[styles.detailLabel, { marginBottom: 6 }]}>uploaded screenshot</Text>
                            <View style={styles.receiptFrame}>
                              <Image
                                source={{ uri: repayment.screenshotUrl }}
                                style={styles.receiptImage}
                                resizeMode="contain"
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function UserNotificationsScreen() {
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
    backgroundColor: '#F8FAFC',
    flexDirection: 'column',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 44 : 20,
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
  notifEmptyTitle: {
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
  // Sub tab bar styles
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  subTabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#0F172A',
  },
  // Metrics widget styles
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  summaryBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#581C87',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  paymentAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  paymentClientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  paymentClientMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  paymentAmountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  paymentAmountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  paymentAmountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  paymentDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  paymentDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    maxWidth: '60%',
    textAlign: 'right',
  },
  receiptContainer: {
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  receiptFrame: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  receiptImage: {
    width: '100%',
    height: 200,
  },
  noReceiptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  noReceiptText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginLeft: 8,
    height: 40,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    height: '100%',
  },
  filterScrollRow: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loanAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loanClientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  loanClientPhone: {
    fontSize: 11,
    color: '#94A3B8',
  },
  loanAmountCompact: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
});
