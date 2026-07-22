import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Dimensions, RefreshControl, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { UserService, AdminService, LoanService, RepaymentService } from '../../api/services';
import { StatusBadge } from '../../components/StatusBadge';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { 
  FileText, Calendar, Clock, ArrowRight, Coins, CreditCard, Shield, CheckCircle2, 
  XCircle, ArrowRightLeft, Landmark, User, ArrowLeft, Mail, Phone, UploadCloud, 
  AlertCircle, ChevronDown, ChevronRight, X, Search, Banknote, Wallet, MoreHorizontal, 
  RefreshCw, Users, Info
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LoansScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (isAdmin) {
    return <AdminLoansDashboard />;
  }

  return <UserLoansHistory />;
}

function AdminLoansDashboard() {
  const router = useRouter();
  const theme = Colors.light;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [loans, setLoans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loanFilter, setLoanFilter] = useState<'all' | 'pending' | 'approved' | 'disbursed' | 'rejected' | 'closed'>('all');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Load Admin Loans
  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await AdminService.getLoans();
      setLoans(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLoans();
    setRefreshing(false);
  };

  // Update Status (Approve, Disburse, Reject)
  const handleUpdateStatus = async (loanId: string, status: string) => {
    let remarks = '';
    if (Platform.OS === 'web') {
      if (status === 'rejected') {
        const val = window.prompt('Enter rejection remarks:');
        if (val === null) return;
        remarks = val;
      } else {
        const confirmAction = window.confirm(`Are you sure you want to update this loan status to ${status.toUpperCase()}?`);
        if (!confirmAction) return;
        remarks = `Updated to ${status} by admin`;
      }
    } else {
      if (status === 'rejected') {
        const confirm = await new Promise<string | null>((resolve) => {
          Alert.prompt(
            'Reject Loan',
            'Enter remarks/reason for rejection:',
            [
              { text: 'Cancel', onPress: () => resolve(null), style: 'cancel' },
              { text: 'Reject', onPress: (val?: string) => resolve(val || 'Rejected by admin'), style: 'destructive' }
            ],
            'plain-text'
          );
        });
        if (confirm === null) return;
        remarks = confirm;
      } else {
        const confirm = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Update Status',
            `Are you sure you want to update this loan status to ${status.toUpperCase()}?`,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Confirm', onPress: () => resolve(true) }
            ]
          );
        });
        if (!confirm) return;
        remarks = `Updated to ${status} by admin`;
      }
    }

    setLoading(true);
    try {
      await AdminService.updateLoanStatus(loanId, status, remarks);
      Alert.alert('Success', `Loan status updated to ${status}.`);
      await loadLoans();
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to update loan status.');
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

  // Compute filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: loans.length };
    loans.forEach((item) => {
      const s = item.loan.status;
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [loans]);

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return loans.filter((item) => {
      const { loan, user: client } = item;
      if (loanFilter !== 'all' && loan.status !== loanFilter) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          client.fullName?.toLowerCase().includes(q) ||
          client.mobileNumber?.includes(q) ||
          loan.loanPurpose?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [loans, loanFilter, searchQuery]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: '#F8FAFC' }]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FileText size={20} color="#4F46E5" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>All Applications</Text>
        </View>
        <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
          <RefreshCw size={18} color="#64748B" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
        }
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by name, phone, or purpose..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        {/* Filters - "All" at first position! */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
          {(['all', 'pending', 'approved', 'disbursed', 'rejected', 'closed'] as const).map((filter) => {
            const isActive = loanFilter === filter;
            const count = filterCounts[filter] || 0;
            return (
              <Pressable
                key={filter}
                onPress={() => setLoanFilter(filter)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterChipBadge, isActive && styles.filterChipBadgeActive]}>
                    <Text style={[styles.filterChipBadgeText, isActive && { color: '#4F46E5' }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Applications List */}
        {loading && loans.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading applications...</Text>
          </View>
        ) : filteredLoans.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Applications Found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search query or status filters.</Text>
          </View>
        ) : (
          filteredLoans.map((item) => {
            const { loan, user: client } = item;
            const isExpanded = expandedLoanId === loan.id;
            const dateStr = new Date(loan.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <Pressable
                key={loan.id}
                style={[styles.loanCard, isExpanded && styles.loanCardExpanded]}
                onPress={() => setExpandedLoanId(isExpanded ? null : loan.id)}
              >
                {/* Header Row */}
                <View style={styles.loanCardHeader}>
                  <View style={styles.loanAvatarCircle}>
                    <Text style={styles.loanAvatarText}>{getInitials(client.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.loanClientName}>{client.fullName}</Text>
                    <Text style={styles.loanClientPhone}>{client.mobileNumber}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.loanAmountText}>{formatCurrency(loan.loanAmount)}</Text>
                    <StatusBadge status={loan.status} />
                  </View>
                </View>

                {/* Sub details */}
                <View style={styles.expandIndicator}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Calendar size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>{dateStr} • {loan.loanDuration} Months</Text>
                  </View>
                  <ChevronDown
                    size={16}
                    color="#94A3B8"
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                  />
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.expandDivider} />

                    {/* SECTION 1: LOAN DETAILS */}
                    <Text style={styles.detailSectionHeader}>Loan Details</Text>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Principal</Text>
                        <Text style={styles.detailValue}>{formatCurrency(loan.loanAmount)}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Interest</Text>
                        <Text style={styles.detailValue}>{loan.interestRate}% ({formatCurrency(loan.interestAmount)})</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Total Payable</Text>
                        <Text style={[styles.detailValue, { color: '#0F172A', fontWeight: '800' }]}>{formatCurrency(loan.totalPayable)}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Scheme</Text>
                        <Text style={styles.detailValue}>{loan.repaymentType === 'emi' ? 'Monthly EMI' : 'Full Payment'}</Text>
                      </View>
                    </View>
                    <Text style={[styles.loanIdLabel, { marginBottom: 12 }]}>Loan ID: {loan.id}</Text>

                    {/* SECTION 2: EMI DETAILS (IF EMI) */}
                    {loan.repaymentType === 'emi' && (
                      <View style={{ marginBottom: 14 }}>
                        <Text style={styles.detailSectionHeader}>EMI Installment Details</Text>
                        <View style={[styles.emiDetailsCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase' }}>Monthly Installment</Text>
                              <Text style={{ fontSize: 18, fontWeight: '800', color: '#4F46E5', marginTop: 2 }}>
                                {formatCurrency(Math.round(Number(loan.totalPayable) / loan.loanDuration))} / Month
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Tenure</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 }}>{loan.loanDuration} Months</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* SECTION 3: BORROWER HOLDER DETAILS */}
                    <Text style={styles.detailSectionHeader}>Borrower / Holder Details</Text>
                    <View style={styles.holderDetailsBox}>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Full Name</Text>
                        <Text style={styles.detailRowVal}>{client.fullName || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Email Address</Text>
                        <Text style={styles.detailRowVal} numberOfLines={1}>{client.email}</Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Mobile Number</Text>
                        <Text style={styles.detailRowVal}>{client.mobileNumber || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Date of Birth</Text>
                        <Text style={styles.detailRowVal}>
                          {client.dob ? new Date(client.dob).toLocaleDateString('en-IN') : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Monthly Income</Text>
                        <Text style={styles.detailRowVal}>
                          {client.monthlyIncome ? formatCurrency(client.monthlyIncome) : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>PAN Number</Text>
                        <Text style={styles.detailRowVal}>{client.panNumber || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Aadhaar Number</Text>
                        <Text style={styles.detailRowVal}>{client.aadhaarNumber || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Address</Text>
                        <Text style={[styles.detailRowVal, { maxWidth: '60%' }]} numberOfLines={2}>
                          {client.address ? `${client.address}, ${client.district || ''}, ${client.state || ''} - ${client.pincode || ''}` : 'N/A'}
                        </Text>
                      </View>

                      {/* Banking Info */}
                      <Text style={[styles.detailRowSectionTitle, { marginTop: 10 }]}>Bank Account Details</Text>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Bank Name</Text>
                        <Text style={styles.detailRowVal}>{client.bankName || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>Account Number</Text>
                        <Text style={styles.detailRowVal}>{client.bankAccountNo || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>IFSC Code</Text>
                        <Text style={styles.detailRowVal}>{client.bankIfsc || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailRowLabel}>UPI ID</Text>
                        <Text style={styles.detailRowVal}>{client.upiId || 'N/A'}</Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      {(loan.status === 'pending' || loan.status === 'under_review') && (
                        <>
                          <Pressable
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleUpdateStatus(loan.id, 'approved')}
                          >
                            <CheckCircle2 size={15} color="#FFF" style={{ marginRight: 5 }} />
                            <Text style={styles.actionBtnText}>Approve</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleUpdateStatus(loan.id, 'rejected')}
                          >
                            <XCircle size={15} color="#FFF" style={{ marginRight: 5 }} />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </Pressable>
                        </>
                      )}
                      {loan.status === 'approved' && (
                        <Pressable
                          style={[styles.actionBtn, styles.disburseBtn]}
                          onPress={() => handleUpdateStatus(loan.id, 'disbursed')}
                        >
                          <Coins size={15} color="#FFF" style={{ marginRight: 5 }} />
                          <Text style={styles.actionBtnText}>Disburse Funds</Text>
                        </Pressable>
                      )}
                      {(loan.status === 'disbursed' || loan.status === 'defaulted') && (
                        <Pressable
                          style={[styles.actionBtn, styles.recordPayBtn]}
                          onPress={() => {
                            router.push({
                              pathname: '/admin',
                              params: {
                                tab: 'repayments',
                                loanId: loan.id,
                                clientName: client.fullName,
                                clientMeta: `${client.email} • ${client.mobileNumber} (${formatCurrency(loan.totalPayable)} total payable)`
                              }
                            });
                          }}
                        >
                          <ArrowRightLeft size={15} color="#FFF" style={{ marginRight: 5 }} />
                          <Text style={styles.actionBtnText}>Log Repayment</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function UserLoansHistory() {
  const router = useRouter();
  const theme = Colors.light;
  const [activeSubTab, setActiveSubTab] = useState<'loans' | 'payments'>('loans');
  const [paying, setPaying] = useState(false);

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

  // Dynamic calculations and state for active repayment option
  const currentLoan = dashboardData?.currentLoan;
  const isRepaymentActive = currentLoan && (currentLoan.status === 'disbursed' || currentLoan.status === 'defaulted');

  const loanAmount = Number(currentLoan?.loanAmount || 0);
  const totalPayable = Number(currentLoan?.totalPayable) || (currentLoan?.repaymentType === 'emi' ? Math.round(loanAmount * 1.4) : Math.round(loanAmount * 1.08));
  const totalRepaid = Number(dashboardData?.repaymentMeta?.totalRepaid || 0);
  const outstandingAmount = currentLoan?.status === 'closed' ? 0 : Math.max(0, totalPayable - totalRepaid);

  const handleMakeRepayment = async () => {
    if (!currentLoan) return;
    router.push(`/loan/${currentLoan.id}`);
  };

  const renderActiveRepaymentHeader = () => {
    if (!isRepaymentActive) return null;
    return (
      <View style={styles.activeRepayHeaderCard}>
        <View style={styles.activeRepayInfo}>
          <Text style={styles.activeRepayTitle}>Active Outstanding Balance</Text>
          <Text style={styles.activeRepayVal}>{formatAmount(outstandingAmount)}</Text>
          <Text style={styles.activeRepaySub}>Total Paid: {formatAmount(totalRepaid)} / {formatAmount(totalPayable)}</Text>
        </View>
        <Pressable 
          style={[styles.activeRepayBtn, paying && { opacity: 0.7 }]} 
          onPress={handleMakeRepayment}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.activeRepayBtnText}>Pay Now</Text>
          )}
        </Pressable>
      </View>
    );
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
            ListHeaderComponent={renderActiveRepaymentHeader}
            refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { paddingTop: 60 }]}>
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
            ListHeaderComponent={renderActiveRepaymentHeader}
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
  loansEmptyTitle: {
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
  // Admin Loans view styles
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
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
  filterChipBadge: {
    marginLeft: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterChipBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
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
  loanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loanCardExpanded: {
    borderColor: '#4F46E5',
    shadowOpacity: 0.08,
  },
  loanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loanAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
  loanClientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  loanClientPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  loanAmountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  expandIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expandedSection: {
    marginTop: 12,
  },
  expandDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  detailSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  detailItem: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 3,
  },
  loanIdLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emiDetailsCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  holderDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailRowLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  detailRowVal: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
    textAlign: 'right',
  },
  detailRowSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
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
  disburseBtn: {
    backgroundColor: '#3B82F6',
  },
  recordPayBtn: {
    backgroundColor: '#8B5CF6',
  },
  activeRepayHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeRepayInfo: {
    flex: 1,
    marginRight: 12,
  },
  activeRepayTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeRepayVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 2,
  },
  activeRepaySub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  activeRepayBtn: {
    backgroundColor: '#1A2980',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  activeRepayBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
