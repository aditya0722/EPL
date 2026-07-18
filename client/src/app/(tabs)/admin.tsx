import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Dimensions, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { AdminService } from '../../api/services';
import { Colors, Spacing } from '../../constants/theme';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { 
  Shield, FileText, CheckCircle2, XCircle, ArrowRightLeft, Landmark, Coins, User, 
  ArrowLeft, Calendar, Clock, Eye, Mail, Phone, UploadCloud, AlertCircle, ChevronDown, ChevronRight, X, Search,
  CreditCard, Banknote, Wallet, MoreHorizontal, RefreshCw, Users, Info
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';

type TabType = 'loans' | 'repayments' | 'kyc' | 'verify_payments';

const { width } = Dimensions.get('window');

export default function AdminScreen() {
  const { user } = useAuth();
  const theme = Colors.light;
  const params = useLocalSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>('kyc');
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // KYC Verification States
  const [kycUsers, setKycUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedUserDocs, setSelectedUserDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Pending User Repayments States
  const [pendingRepayments, setPendingRepayments] = useState<any[]>([]);
  
  // All Repayments History States
  const [allRepayments, setAllRepayments] = useState<any[]>([]);
  const [paymentsSubTab, setPaymentsSubTab] = useState<'pending' | 'history'>('pending');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Search & Filter Query
  const [searchQuery, setSearchQuery] = useState('');
  const [loanFilter, setLoanFilter] = useState<'pending' | 'approved' | 'disbursed' | 'rejected' | 'closed' | 'all'>('pending');

  // Expanded loan card
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Form State for Recording Repayment
  const [loanId, setLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank_transfer' | 'cash' | 'other'>('upi');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submittingRepayment, setSubmittingRepayment] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedClientMeta, setSelectedClientMeta] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Handle deep-link tab param from dashboard quick actions
  useEffect(() => {
    if (params.tab && typeof params.tab === 'string') {
      setActiveTab(params.tab as TabType);
      if (params.tab === 'repayments') {
        if (params.loanId) setLoanId(params.loanId as string);
        if (params.clientName) setSelectedClientName(params.clientName as string);
        if (params.clientMeta) setSelectedClientMeta(params.clientMeta as string);
      }
    }
  }, [params.tab, params.loanId, params.clientName, params.clientMeta]);

  // Load Admin Loans
  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await AdminService.getLoans();
      setLoans(res.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to fetch loans list.');
    } finally {
      setLoading(false);
    }
  };

  // Load KYC Users
  const loadKycUsers = async () => {
    setLoading(true);
    try {
      const res = await AdminService.getUsers({ kycStatus: 'submitted' });
      setKycUsers(res.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to fetch KYC users.');
    } finally {
      setLoading(false);
    }
  };

  // Load Pending Repayments
  const loadPendingRepayments = async () => {
    setLoading(true);
    try {
      const res = await AdminService.getPendingRepayments();
      setPendingRepayments(res.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to fetch pending repayments.');
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
      Alert.alert('Error', err.friendlyMessage || 'Failed to fetch payments history.');
    } finally {
      setLoading(false);
    }
  };

  // Load documents for a specific user
  const loadUserDocs = async (userId: string) => {
    setLoadingDocs(true);
    try {
      const res = await AdminService.getUserDocuments(userId);
      setSelectedUserDocs(res.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to fetch user documents.');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadLoans();
      loadKycUsers();
      loadPendingRepayments();
      loadAllRepayments();
    }
  }, [user]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'loans') await loadLoans();
      if (activeTab === 'kyc') await loadKycUsers();
      if (activeTab === 'verify_payments') {
        await loadPendingRepayments();
        await loadAllRepayments();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Tab Switch Handler
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
    if (tab === 'loans') loadLoans();
    if (tab === 'kyc') {
      setSelectedUser(null);
      loadKycUsers();
    }
    if (tab === 'verify_payments') {
      loadPendingRepayments();
      loadAllRepayments();
    }
  };

  // Handle status update (Approve, Disburse, Reject)
  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    if (Platform.OS === 'web') {
      if (nextStatus === 'rejected') {
        const remarksText = window.prompt('Enter rejection remarks:');
        if (remarksText !== null) {
          await processStatusUpdate(id, nextStatus, remarksText || 'Rejected by admin');
        }
      } else {
        const confirmAction = window.confirm(`Are you sure you want to change status to ${nextStatus.toUpperCase()}?`);
        if (confirmAction) {
          await processStatusUpdate(id, nextStatus, 'Approved by admin');
        }
      }
    } else {
      if (nextStatus === 'rejected') {
        Alert.prompt(
          'Reject Application',
          'Enter rejection remarks:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async (text?: string) => {
                await processStatusUpdate(id, nextStatus, text || 'Rejected by admin');
              },
            },
          ],
          'plain-text'
        );
      } else {
        Alert.alert(
          'Confirm Action',
          `Are you sure you want to change status to ${nextStatus.toUpperCase()}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm',
              onPress: async () => {
                await processStatusUpdate(id, nextStatus, 'Approved by admin');
              },
            },
          ]
        );
      }
    }
  };

  const processStatusUpdate = async (id: string, status: string, remarksText: string) => {
    try {
      setLoading(true);
      await AdminService.updateLoanStatus(id, status, remarksText);
      Alert.alert('Success', `Loan status updated to ${status}`);
      await loadLoans();
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to update loan status.');
    } finally {
      setLoading(false);
    }
  };

  // Verify Document (Approve/Reject)
  const handleVerifyDoc = async (docId: string, status: 'approved' | 'rejected') => {
    if (Platform.OS === 'web') {
      if (status === 'rejected') {
        const remarksText = window.prompt('Enter rejection remarks:');
        if (remarksText !== null) {
          await processVerifyDoc(docId, status, remarksText || 'Rejected by admin');
        }
      } else {
        const confirmAction = window.confirm('Are you sure you want to APPROVE this document?');
        if (confirmAction) {
          await processVerifyDoc(docId, status, 'Approved by admin');
        }
      }
    } else {
      if (status === 'rejected') {
        Alert.prompt(
          'Reject Document',
          'Enter rejection remarks:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async (text?: string) => {
                await processVerifyDoc(docId, status, text || 'Rejected by admin');
              },
            },
          ],
          'plain-text'
        );
      } else {
        Alert.alert(
          'Approve Document',
          'Are you sure you want to APPROVE this document?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Approve',
              onPress: async () => {
                await processVerifyDoc(docId, status, 'Approved by admin');
              },
            },
          ]
        );
      }
    }
  };

  const processVerifyDoc = async (docId: string, status: 'approved' | 'rejected', remarksText: string) => {
    try {
      setLoadingDocs(true);
      await AdminService.verifyDocument(docId, status, remarksText);
      Alert.alert('Success', `Document updated to ${status}`);
      if (selectedUser) {
        await loadUserDocs(selectedUser.id);
        await loadKycUsers();
      }
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to update document status.');
    } finally {
      setLoadingDocs(false);
    }
  };
  
  // Bulk KYC Verification
  const handleVerifyUserKycInstantly = async (userId: string, fullName: string) => {
    const confirmAction = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to verify KYC for ${fullName} instantly?`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Verify KYC Instantly',
            `Are you sure you want to verify KYC for ${fullName} instantly? This will automatically approve all their pending documents.`,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Verify Instantly', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmAction) return;

    setLoading(true);
    try {
      await AdminService.verifyUserKyc(userId, 'verified');
      Alert.alert('Success', `${fullName}'s KYC has been successfully verified!`);
      await loadKycUsers();
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to verify user KYC.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Repayment
  const handleSubmitRepayment = async () => {
    if (!loanId) {
      Alert.alert('Error', 'Please select a customer first.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Please provide a positive payment amount.');
      return;
    }
    if (!transactionRef) {
      Alert.alert('Error', 'Please provide a transaction reference number.');
      return;
    }

    setSubmittingRepayment(true);
    try {
      await AdminService.recordRepayment({
        loanId,
        amount: Number(amount),
        paymentDate: new Date().toISOString(),
        paymentMethod,
        transactionRef,
        remarks: remarks || 'Repayment recorded by admin',
      });

      Alert.alert('Success', 'Repayment successfully logged!');
      setLoanId('');
      setAmount('');
      setTransactionRef('');
      setRemarks('');
      setSelectedClientName('');
      setSelectedClientMeta('');
      await loadLoans();
      handleTabChange('loans');
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to record repayment.');
    } finally {
      setSubmittingRepayment(false);
    }
  };

  // Verify Repayment (Submitted by User)
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
      await loadPendingRepayments();
    } catch (err: any) {
      Alert.alert('Error', err.friendlyMessage || 'Failed to verify repayment.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.centerContainer}>
        <Shield size={48} color="#EF4444" />
        <Text style={styles.unauthorizedText}>Access Denied. Admin privileges required.</Text>
      </View>
    );
  }

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  // Compute filter counts for badges
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
        return client.fullName?.toLowerCase().includes(q) || client.mobileNumber?.includes(q);
      }
      return true;
    });
  }, [loans, loanFilter, searchQuery]);

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

  // Tab badge counts
  const tabBadges = {
    loans: filterCounts['pending'] || 0,
    kyc: kycUsers.length,
    verify_payments: pendingRepayments.length,
    repayments: 0,
  };

  // Helper: get initials
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Helper: status badge style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', color: '#D97706' };
      case 'approved': return { bg: '#D1FAE5', color: '#065F46' };
      case 'disbursed': return { bg: '#DBEAFE', color: '#1E40AF' };
      case 'rejected': return { bg: '#FEE2E2', color: '#B91C1C' };
      case 'closed': return { bg: '#F1F5F9', color: '#475569' };
      case 'defaulted': return { bg: '#FEE2E2', color: '#B91C1C' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  // Tab config
  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'kyc', label: 'KYC', icon: <Shield size={16} color={activeTab === 'kyc' ? '#FFF' : '#64748B'} /> },
    { key: 'repayments', label: 'Record', icon: <Coins size={16} color={activeTab === 'repayments' ? '#FFF' : '#64748B'} /> },
  ];

  // Payment method icons
  const paymentMethodIcons: Record<string, React.ReactNode> = {
    upi: <Wallet size={16} color={paymentMethod === 'upi' ? '#FFF' : '#64748B'} />,
    bank_transfer: <Landmark size={16} color={paymentMethod === 'bank_transfer' ? '#FFF' : '#64748B'} />,
    cash: <Banknote size={16} color={paymentMethod === 'cash' ? '#FFF' : '#64748B'} />,
    other: <MoreHorizontal size={16} color={paymentMethod === 'other' ? '#FFF' : '#64748B'} />,
  };

  // Filtered clients for record payment
  const availableClients = useMemo(() => {
    return loans
      .filter((item: any) => item.loan.status === 'disbursed' || item.loan.status === 'defaulted')
      .filter((item: any) => {
        if (clientSearchQuery.trim().length === 0) return true;
        const q = clientSearchQuery.toLowerCase();
        return item.user.fullName?.toLowerCase().includes(q) || item.user.mobileNumber?.includes(q);
      });
  }, [loans, clientSearchQuery]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: '#F8FAFC' }]}
    >
      {/* COMPACT HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield size={20} color="#4F46E5" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
        <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
          <RefreshCw size={18} color="#64748B" />
        </Pressable>
      </View>

      {/* TAB BAR WITH BADGES */}
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const badge = tabBadges[tab.key];
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => handleTabChange(tab.key)}
              >
                {tab.icon}
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                {badge > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
        }
      >
        
        {/* ==================== TAB 1: APPLICATIONS ==================== */}
        {activeTab === 'loans' && (
          <View>
            {/* Search + Filter */}
            <View style={styles.searchContainer}>
              <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search by name or phone..."
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

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading applications...</Text>
              </View>
            ) : filteredLoans.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Applications Found</Text>
                <Text style={styles.emptyDesc}>
                  {searchQuery ? 'Try a different search term.' : `No ${loanFilter === 'all' ? '' : loanFilter} applications at the moment.`}
                </Text>
              </View>
            ) : (
              filteredLoans.map((item) => {
                const { loan, user: client } = item;
                const statusStyle = getStatusStyle(loan.status);
                const isExpanded = expandedLoanId === loan.id;
                const dateStr = new Date(loan.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <Pressable
                    key={loan.id}
                    style={styles.loanCard}
                    onPress={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                  >
                    {/* Compact Header Row */}
                    <View style={styles.loanCardHeader}>
                      <View style={styles.loanAvatarCircle}>
                        <Text style={styles.loanAvatarText}>{getInitials(client.fullName)}</Text>
                      </View>
                      <View style={styles.loanCardInfo}>
                        <Text style={styles.loanClientName} numberOfLines={1}>{client.fullName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Phone size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.loanClientPhone}>{client.mobileNumber}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.loanAmountCompact}>{formatCurrency(loan.loanAmount)}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                            {loan.status.toUpperCase().replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Expand indicator */}
                    <View style={styles.expandIndicator}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Calendar size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>{dateStr} • {loan.loanDuration}M</Text>
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
                                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#4F46E5', marginTop: 2 }}>
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
                                setLoanId(loan.id);
                                setSelectedClientName(client.fullName);
                                setSelectedClientMeta(`${client.email} • ${client.mobileNumber} (${formatCurrency(loan.totalPayable)} total payable)`);
                                handleTabChange('repayments');
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
          </View>
        )}

        {/* ==================== TAB 2: KYC REVIEW ==================== */}
        {activeTab === 'kyc' && (
          selectedUser ? (
            <View style={styles.kycDetailCard}>
              <Pressable style={styles.backButton} onPress={() => setSelectedUser(null)}>
                <ArrowLeft size={16} color="#4F46E5" style={{ marginRight: 8 }} />
                <Text style={styles.backButtonText}>Back to KYC list</Text>
              </Pressable>

              <View style={styles.kycUserHeader}>
                <View style={styles.kycAvatarCircle}>
                  <Text style={styles.kycAvatarText}>{getInitials(selectedUser.fullName)}</Text>
                </View>
                <View style={{ marginLeft: 14 }}>
                  <Text style={styles.kycUserName}>{selectedUser.fullName}</Text>
                  <Text style={styles.kycUserEmail}>{selectedUser.email}</Text>
                </View>
              </View>

              <View style={styles.kycDivider} />

              {loadingDocs ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                </View>
              ) : selectedUserDocs.length === 0 ? (
                <View style={styles.emptyState}>
                  <FileText size={32} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>No Documents</Text>
                  <Text style={styles.emptyDesc}>No uploaded documents found for this user.</Text>
                </View>
              ) : (
                selectedUserDocs.map((doc) => {
                  const docStatus = getStatusStyle(doc.status);
                  return (
                    <View key={doc.id} style={[styles.docCard, { borderLeftColor: docStatus.color, borderLeftWidth: 3 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <FileText size={16} color="#4F46E5" style={{ marginRight: 8 }} />
                          <Text style={styles.docTypeLabel}>{doc.documentType.toUpperCase().replace('_', ' ')}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: docStatus.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: docStatus.color }]}>{doc.status.toUpperCase()}</Text>
                        </View>
                      </View>

                      <Image
                        source={{ uri: doc.cloudinaryUrl }}
                        style={styles.docImage}
                        resizeMode="contain"
                      />

                      {doc.adminRemarks && (
                        <View style={styles.remarksBox}>
                          <Info size={12} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.remarksText}>{doc.adminRemarks}</Text>
                        </View>
                      )}

                      {doc.status === 'pending' && (
                        <View style={styles.actionRow}>
                          <Pressable
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleVerifyDoc(doc.id, 'approved')}
                          >
                            <CheckCircle2 size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.actionBtnText}>Approve</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleVerifyDoc(doc.id, 'rejected')}
                          >
                            <XCircle size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <View>
              {/* Summary Banner */}
              {kycUsers.length > 0 && (
                <View style={styles.summaryBanner}>
                  <Users size={18} color="#7C3AED" style={{ marginRight: 10 }} />
                  <Text style={styles.summaryBannerText}>
                    <Text style={{ fontWeight: '800' }}>{kycUsers.length}</Text> user{kycUsers.length > 1 ? 's' : ''} pending KYC review
                  </Text>
                </View>
              )}

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text style={styles.loadingText}>Loading KYC users...</Text>
                </View>
              ) : kycUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Shield size={40} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>All Clear!</Text>
                  <Text style={styles.emptyDesc}>No users awaiting KYC review.</Text>
                </View>
              ) : (
                kycUsers.map((userItem) => (
                  <View key={userItem.id} style={styles.kycCard}>
                    <View style={styles.kycCardHeader}>
                      <View style={styles.kycCardAvatarCircle}>
                        <Text style={styles.kycCardAvatarText}>{getInitials(userItem.fullName)}</Text>
                      </View>
                      <View style={styles.kycCardInfo}>
                        <Text style={styles.kycCardName}>{userItem.fullName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                          <Mail size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.kycCardMeta}>{userItem.email}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Phone size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.kycCardMeta}>{userItem.mobileNumber}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>SUBMITTED</Text>
                      </View>
                    </View>

                    <View style={styles.kycCardActions}>
                      <Pressable
                        style={[styles.kycActionBtn, styles.kycReviewBtn]}
                        onPress={() => {
                          setSelectedUser(userItem);
                          loadUserDocs(userItem.id);
                        }}
                      >
                        <Eye size={15} color="#4F46E5" style={{ marginRight: 6 }} />
                        <Text style={styles.kycReviewBtnText}>Review Docs</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.kycActionBtn, styles.kycVerifyBtn]}
                        onPress={() => handleVerifyUserKycInstantly(userItem.id, userItem.fullName)}
                      >
                        <CheckCircle2 size={15} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.kycVerifyBtnText}>Verify Instantly</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          )
        )}

        {/* ==================== TAB 3: PAYMENTS HUB ==================== */}
        {activeTab === 'verify_payments' && (
          <View>
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

                {loading ? (
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

                {loading ? (
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
                        style={[styles.loanCard, { paddingVertical: 14 }]}
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
          </View>
        )}

        {/* ==================== TAB 4: RECORD PAYMENT ==================== */}
        {activeTab === 'repayments' && (
          <View style={styles.recordPaymentCard}>
            <View style={styles.recordPayHeader}>
              <Coins size={22} color="#4F46E5" style={{ marginRight: 10 }} />
              <Text style={styles.recordPayTitle}>Record Client Repayment</Text>
            </View>

            {/* Client Selector */}
            {loanId ? (
              <View style={styles.selectedClientCard}>
                <View style={styles.selectedClientLeft}>
                  <View style={[styles.loanAvatarCircle, { backgroundColor: '#EEF2FF' }]}>
                    <User size={18} color="#4F46E5" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.selectedClientLabel}>SELECTED CUSTOMER</Text>
                    <Text style={styles.selectedClientNameText}>{selectedClientName}</Text>
                    <Text style={styles.selectedClientMetaText}>{selectedClientMeta}</Text>
                    <Text style={styles.selectedClientIdText}>Loan: {loanId.substring(0, 12)}...</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    setLoanId('');
                    setSelectedClientName('');
                    setSelectedClientMeta('');
                  }}
                  style={styles.clearClientBtn}
                >
                  <X size={16} color="#4F46E5" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.clientSelectorSection}>
                <Text style={styles.selectorLabel}>Select Customer</Text>

                {/* Search */}
                <View style={styles.clientSearchBar}>
                  <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search by name or phone..."
                    value={clientSearchQuery}
                    onChangeText={setClientSearchQuery}
                    placeholderTextColor="#94A3B8"
                    style={styles.clientSearchInput}
                  />
                </View>

                {availableClients.length === 0 ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 13, fontStyle: 'italic' }}>
                      {loans.filter((i: any) => i.loan.status === 'disbursed' || i.loan.status === 'defaulted').length === 0
                        ? 'No active disbursed loans found.'
                        : 'No matching clients found.'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.clientListContainer}>
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
                      {availableClients.map((item) => {
                        const { loan, user: client } = item;
                        return (
                          <Pressable
                            key={loan.id}
                            style={({ pressed }) => [styles.clientListItem, { backgroundColor: pressed ? '#F1F5F9' : '#FFF' }]}
                            onPress={() => {
                              setLoanId(loan.id);
                              setSelectedClientName(client.fullName);
                              setSelectedClientMeta(`${client.email} • ${client.mobileNumber} (${formatCurrency(loan.totalPayable)} outstanding)`);
                              setClientSearchQuery('');
                            }}
                          >
                            <View style={styles.clientListAvatar}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#4F46E5' }}>{getInitials(client.fullName)}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={styles.clientListName}>{client.fullName}</Text>
                              <Text style={styles.clientListSub}>
                                {formatCurrency(loan.totalPayable)} payable • {client.mobileNumber}
                              </Text>
                            </View>
                            <ChevronRight size={16} color="#CBD5E1" />
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formSection}>
              <InputField
                label="Repayment Amount (INR)"
                placeholder="e.g. 5000"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                icon={<Coins size={20} color={theme.textSecondary} />}
              />

              <Text style={styles.fieldLabel}>Payment Method</Text>
              <View style={styles.methodRow}>
                {(['upi', 'bank_transfer', 'cash', 'other'] as const).map((method) => {
                  const isSelected = paymentMethod === method;
                  const labels: Record<string, string> = { upi: 'UPI', bank_transfer: 'Bank', cash: 'Cash', other: 'Other' };
                  return (
                    <Pressable
                      key={method}
                      onPress={() => setPaymentMethod(method)}
                      style={[styles.methodChip, isSelected && styles.methodChipActive]}
                    >
                      {paymentMethodIcons[method]}
                      <Text style={[styles.methodChipText, isSelected && styles.methodChipTextActive]}>
                        {labels[method]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <InputField
                label="Transaction Reference No."
                placeholder="UPI Ref or Bank Txn ID"
                value={transactionRef}
                onChangeText={setTransactionRef}
                icon={<Landmark size={20} color={theme.textSecondary} />}
              />

              <InputField
                label="Remarks (Optional)"
                placeholder="Installment payment details"
                value={remarks}
                onChangeText={setRemarks}
                icon={<User size={20} color={theme.textSecondary} />}
              />

              <PrimaryButton
                title="Record Payment"
                onPress={handleSubmitRepayment}
                loading={submittingRepayment}
                style={{ marginTop: 16 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tab Bar
  tabBarWrapper: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: '#4F46E5',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 4,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    marginLeft: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  // Search
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
  // Filter Chips
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterChipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  // Loading & Empty States
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
  // Loan Cards (Compact + Expandable)
  loanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  loanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loanAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  loanCardInfo: {
    flex: 1,
    marginLeft: 12,
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
    marginBottom: 4,
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
  expandIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expandedSection: {
    marginTop: 4,
  },
  expandDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    width: '50%',
    marginBottom: 10,
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
  loanIdLabel: {
    fontSize: 10,
    color: '#CBD5E1',
    marginBottom: 12,
  },
  // Action Buttons
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
    flex: 1,
    marginLeft: 0,
  },
  recordPayBtn: {
    backgroundColor: '#4F46E5',
    flex: 1,
    marginLeft: 0,
  },
  // Access Denied
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unauthorizedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
    textAlign: 'center',
  },
  // Summary Banner
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
  // KYC Cards
  kycCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  kycCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycCardAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycCardAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C3AED',
  },
  kycCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  kycCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  kycCardMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  kycCardActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  kycActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
  },
  kycReviewBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  kycReviewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  kycVerifyBtn: {
    backgroundColor: '#10B981',
  },
  kycVerifyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // KYC Detail View
  kycDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  kycUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  kycAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3AED',
  },
  kycUserName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  kycUserEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  kycDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  // Document Cards
  docCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  docImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  remarksBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  remarksText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  // Payment Verification Cards
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
  // Record Payment Form
  recordPaymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  recordPayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordPayTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  selectedClientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  selectedClientLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedClientLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  selectedClientNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 1,
  },
  selectedClientMetaText: {
    fontSize: 11,
    color: '#4338CA',
    marginTop: 1,
  },
  selectedClientIdText: {
    fontSize: 10,
    color: '#818CF8',
    marginTop: 2,
  },
  clearClientBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  clientSelectorSection: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  clientSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clientSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    height: '100%',
  },
  clientListContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  clientListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  clientListAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientListName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  clientListSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  formSection: {
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  methodChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 6,
  },
  methodChipTextActive: {
    color: '#FFFFFF',
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
  // Borrower and EMI details styling inside loan card
  detailSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
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
});
