import React from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Pressable, Image, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { UserService, AdminService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { LoanCard } from '../../components/LoanCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { PlusCircle, PhoneCall, ArrowRight, User, Users, Shield, TrendingUp, Landmark, AlertCircle, Calendar, CheckCircle2, XCircle, Check, AlertTriangle, ChevronRight, Clock, Coins, Bell, Flag, FileText as FileTextIcon, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const isAdmin = user?.role === 'admin';

  // Fetch live dashboard data (or admin dashboard stats)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [isAdmin ? 'adminDashboard' : 'dashboard'],
    queryFn: async () => {
      if (isAdmin) {
        const res = await AdminService.getDashboardStats();
        return res.data;
      } else {
        const res = await UserService.getDashboard();
        return res.data;
      }
    },
    refetchInterval: 15000, // Auto refresh every 15 seconds
  });

  const { data: adminLoansData, refetch: refetchLoans } = useQuery({
    queryKey: ['adminLoans'],
    queryFn: async () => {
      if (isAdmin) {
        const res = await AdminService.getLoans();
        return res.data || [];
      }
      return [];
    },
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const onRefresh = React.useCallback(() => {
    refetch();
    if (isAdmin) {
      refetchLoans();
    }
  }, [refetch, refetchLoans, isAdmin]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !data) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Failed to load dashboard</Text>
        <PrimaryButton title="Retry" onPress={onRefresh} style={{ marginTop: 16 }} />
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



  // ADMIN DASHBOARD VIEW
  if (isAdmin) {
    const {
      loansStats = {},
    } = data;

    const formatYLabel = (val: number) => {
      if (val >= 100000) {
        return `₹${(val / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`;
      }
      return formatCurrency(val);
    };

    const LineChart = () => {
      const monthlyData = data.monthlyDisbursals || [];
      const chartHeight = 120;
      const chartWidth = Dimensions.get('window').width - 48 - 45;

      if (monthlyData.length === 0) {
        return (
          <View style={{ height: chartHeight + 20, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#94A3B8', fontSize: 13 }}>No trend data found.</Text>
          </View>
        );
      }

      const chartPoints = monthlyData.slice(0, 5).reverse();
      const amounts = chartPoints.map((m: any) => m.amount);
      const maxVal = Math.max(...amounts, 25000) * 1.2;

      const points = chartPoints.map((m: any, index: number) => {
        const x = (index / Math.max(1, chartPoints.length - 1)) * chartWidth;
        const y = chartHeight - (m.amount / maxVal) * chartHeight;
        return { x, y, month: m.month, amount: m.amount };
      });

      const formatChartY = (val: number) => {
        if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
        return `${val}`;
      };

      return (
        <View style={{ height: chartHeight + 35, position: 'relative', marginTop: 12 }}>
          {[0, 0.33, 0.66, 1].map((r, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 35,
                right: 0,
                top: r * chartHeight,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
                borderStyle: 'dashed',
              }}
            />
          ))}
          <View style={{ position: 'absolute', left: 0, width: 30, height: chartHeight, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4 }}>
            <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '500' }}>{formatChartY(maxVal)}</Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '500' }}>{formatChartY(maxVal * 0.66)}</Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '500' }}>{formatChartY(maxVal * 0.33)}</Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '500' }}>0</Text>
          </View>
          {points.map((p: any, i: number) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: prev.x + 35,
                  top: prev.y,
                  width: length,
                  height: 2.5,
                  backgroundColor: '#6366F1',
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'top left',
                }}
              />
            );
          })}
          {points.map((p: any, i: number) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: p.x + 35 - 4,
                top: p.y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#4F46E5',
                borderWidth: 1.5,
                borderColor: '#FFFFFF',
              }}
            />
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 35, marginTop: chartHeight + 10 }}>
            {points.map((p: any, i: number) => {
              const parts = p.month.split('-');
              const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const monthText = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
              return (
                <Text key={i} style={{ fontSize: 10, color: '#94A3B8', fontWeight: '500' }}>
                  {monthText}
                </Text>
              );
            })}
          </View>
        </View>
      );
    };

    // Dynamic greeting
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 17) return 'Good Afternoon';
      return 'Good Evening';
    };

    const todayDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Recent loans for activity feed
    const recentLoans = (adminLoansData || []).slice(0, 5);

    // Quick action items
    const quickActions = [
      { label: 'Pending\nLoans', count: loansStats.pendingLoans || 0, icon: <Clock size={22} color="#EA580C" />, bg: '#FFF7ED', tab: 'loans' },
      { label: 'KYC\nReview', count: loansStats.pendingKyc || 0, icon: <Shield size={22} color="#7C3AED" />, bg: '#F3E8FF', tab: 'kyc' },
      { label: 'Verify\nPayments', count: loansStats.pendingPayments || 0, icon: <CheckCircle2 size={22} color="#0891B2" />, bg: '#ECFEFF', tab: 'verify_payments' },
      { label: 'Record\nPayment', count: null, icon: <Coins size={22} color="#059669" />, bg: '#ECFDF5', tab: 'repayments' },
    ];

    const getStatusBadgeStyle = (status: string) => {
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

    return (
      <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
        {/* Admin Greeting Header */}
        <View style={styles.adminGreetingHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminGreeting}>{getGreeting()}, Admin</Text>
            <Text style={styles.adminDateText}>{todayDate}</Text>
          </View>
          <Pressable style={styles.bellButton}>
            <Bell size={24} color="#0F172A" />
            {(loansStats.pendingLoans > 0) && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{loansStats.pendingLoans}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: 100 }]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        >
          {/* TOTAL DISBURSED HERO CARD */}
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalDisbursedCard}
          >
            <View style={styles.disbursedCardLeft}>
              <Text style={styles.disbursedLabel}>Total Disbursed</Text>
              <Text style={styles.disbursedAmountText}>
                {formatYLabel(loansStats.disbursedAmount || 0)}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' }}>COLLECTED</Text>
                  <Text style={{ color: '#A5F3FC', fontSize: 14, fontWeight: '800', marginTop: 2 }}>
                    {formatYLabel(loansStats.collectedAmount || 0)}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' }}>OUTSTANDING</Text>
                  <Text style={{ color: '#FCD34D', fontSize: 14, fontWeight: '800', marginTop: 2 }}>
                    {formatYLabel(loansStats.outstandingAmount || 0)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.disbursedCardRight}>
              <View style={styles.coinsIconCircle}>
                <Coins size={36} color="#FFFFFF" opacity={0.8} />
              </View>
            </View>
          </LinearGradient>

          {/* QUICK ACTIONS */}
          <Text style={styles.adminSectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((item, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [styles.quickActionCard, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push({ pathname: '/(tabs)/admin', params: { tab: item.tab } })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: item.bg }]}>
                  {item.icon}
                </View>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
                {item.count !== null && item.count > 0 && (
                  <View style={styles.quickActionBadge}>
                    <Text style={styles.quickActionBadgeText}>{item.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* OVERVIEW STATS */}
          <View style={styles.overviewHeaderRow}>
            <Text style={styles.overviewTitle}>Overview</Text>
          </View>

          <View style={styles.overviewGrid}>
            <View style={styles.gridCard}>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridCardLabel}>Pending Review</Text>
                <Text style={styles.gridCardValue}>{loansStats.pendingLoans || 0}</Text>
              </View>
              <View style={[styles.gridIconContainer, { backgroundColor: '#FFF7ED' }]}>
                <Clock size={20} color="#EA580C" />
              </View>
            </View>

            <View style={styles.gridCard}>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridCardLabel}>Approved Loans</Text>
                <Text style={styles.gridCardValue}>{loansStats.approvedLoans || 0}</Text>
              </View>
              <View style={[styles.gridIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <CheckCircle2 size={20} color="#2E7D32" />
              </View>
            </View>

            <View style={styles.gridCard}>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridCardLabel}>Rejected Loans</Text>
                <Text style={styles.gridCardValue}>{loansStats.rejectedLoans || 0}</Text>
              </View>
              <View style={[styles.gridIconContainer, { backgroundColor: '#FFEBEE' }]}>
                <XCircle size={20} color="#C62828" />
              </View>
            </View>

            <View style={styles.gridCard}>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridCardLabel}>Active Loans</Text>
                <Text style={styles.gridCardValue}>{loansStats.disbursedLoans || 0}</Text>
              </View>
              <View style={[styles.gridIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <TrendingUp size={20} color="#1565C0" />
              </View>
            </View>

            <View style={styles.gridCard}>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridCardLabel}>Completed Loans</Text>
                <Text style={styles.gridCardValue}>{loansStats.closedLoans || 0}</Text>
              </View>
              <View style={[styles.gridIconContainer, { backgroundColor: '#EDE7F6' }]}>
                <Flag size={20} color="#6A1B9A" />
              </View>
            </View>

            <View style={styles.gridCard}>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridCardLabel}>Overdue Loans</Text>
                <Text style={styles.gridCardValue}>{loansStats.defaultedLoans || 0}</Text>
              </View>
              <View style={[styles.gridIconContainer, { backgroundColor: '#FDF2F2' }]}>
                <AlertTriangle size={20} color="#DC2626" />
              </View>
            </View>
          </View>

          {/* LOAN AMOUNT OVERVIEW LINE CHART */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Disbursement Trend</Text>
            </View>
            <LineChart />
          </View>

          {/* RECENT ACTIVITY FEED */}
          <View style={styles.overviewHeaderRow}>
            <Text style={styles.overviewTitle}>Recent Applications</Text>
            <Pressable onPress={() => router.push('/(tabs)/admin')}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          {recentLoans.length === 0 ? (
            <View style={styles.emptyRecentCard}>
              <FileTextIcon size={28} color="#CBD5E1" />
              <Text style={styles.emptyRecentText}>No recent applications</Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recentLoans.map((item: any) => {
                const { loan, user: client } = item;
                const badgeStyle = getStatusBadgeStyle(loan.status);
                const dateStr = new Date(loan.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                });
                const initials = client.fullName
                  ? client.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
                  : '?';

                return (
                  <Pressable
                    key={loan.id}
                    style={({ pressed }) => [styles.recentRowCard, { opacity: pressed ? 0.9 : 1 }]}
                    onPress={() => router.push('/(tabs)/admin')}
                  >
                    <View style={styles.recentRowLeft}>
                      <View style={styles.recentAvatarCircle}>
                        <Text style={styles.recentAvatarText}>{initials}</Text>
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.recentBorrowerName}>{client.fullName}</Text>
                        <Text style={styles.recentLoanMeta}>{dateStr} • {loan.loanDuration}M tenure</Text>
                      </View>
                    </View>
                    <View style={styles.recentRowRight}>
                      <Text style={styles.recentAmount}>{formatCurrency(loan.loanAmount)}</Text>
                      <View style={[styles.recentStatusBadge, { backgroundColor: badgeStyle.bg }]}>
                        <Text style={[styles.recentStatusText, { color: badgeStyle.color }]}>{loan.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  const { currentLoan, repaymentMeta, notifications } = data;
  const loanAmount = Number(currentLoan?.loanAmount || 0);
  const totalPayable = Number(currentLoan?.totalPayable) || (currentLoan?.repaymentType === 'emi' ? Math.round(loanAmount * 1.4) : Math.round(loanAmount * 1.08));
  const totalRepaid = Number(repaymentMeta?.totalRepaid || 0);
  const outstandingAmount = currentLoan?.status === 'closed' ? 0 : Math.max(0, totalPayable - totalRepaid);
  const unreadNotifs = notifications.filter((n: any) => !n.read).length;
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'User';
  const hasActiveLoan = currentLoan && ['pending', 'under_review', 'documents_required', 'approved', 'disbursed'].includes(currentLoan.status);

  return (
    <View style={[styles.container, { backgroundColor: '#F4F6F9' }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingLabel}>Hello,</Text>
          <Text style={styles.username}>{firstName}</Text>
        </View>
        
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
             <User size={20} color="#666" />
          </View>
          {unreadNotifs > 0 && <View style={styles.badge} />}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      >
        <Pressable 
          disabled={!currentLoan}
          onPress={() => currentLoan && router.push(`/loan/${currentLoan.id}`)}
        >
          <LoanCard currentLoan={currentLoan} outstandingAmount={outstandingAmount} />
        </Pressable>

        {/* Dynamic Repayment Schedule Breakdown on Dashboard */}
        {currentLoan && (currentLoan.status === 'disbursed' || currentLoan.status === 'defaulted') && (
          <View style={styles.repayCard}>
            <Text style={styles.repayCardTitle}>Repayment Schedule & Progress</Text>
            
            {currentLoan.repaymentType === 'emi' ? (
              (() => {
                const duration = currentLoan.loanDuration || 3;
                const loanAmount = Number(currentLoan.loanAmount || 0);
                // Fallback calculations for totalPayable
                const totalPayable = Number(currentLoan.totalPayable) || Math.round(loanAmount * 1.4);
                const totalRepaid = Number(repaymentMeta?.totalRepaid || 0);
                const installmentAmount = Math.round(totalPayable / duration) || 1;

                return Array.from({ length: duration }).map((_, idx) => {
                  const monthNum = idx + 1;
                  const requiredByThisMonth = installmentAmount * monthNum;
                  
                  let paidForThisMonth = 0;
                  if (totalRepaid >= requiredByThisMonth) {
                    paidForThisMonth = installmentAmount;
                  } else if (totalRepaid > installmentAmount * idx) {
                    paidForThisMonth = totalRepaid - (installmentAmount * idx);
                  }

                  const remainingForThisMonth = installmentAmount - paidForThisMonth;
                  const progress = paidForThisMonth / installmentAmount;

                  let statusText = 'Pending';
                  let statusColor = '#64748B'; 
                  let progressColor = '#E2E8F0';
                  let icon = <Clock size={16} color="#64748B" />;

                  if (paidForThisMonth === installmentAmount) {
                    statusText = 'Paid';
                    statusColor = '#10B981';
                    progressColor = '#10B981';
                    icon = <CheckCircle2 size={16} color="#10B981" />;
                  } else if (paidForThisMonth > 0) {
                    statusText = `Partially Paid (₹${remainingForThisMonth.toLocaleString('en-IN')} remaining)`;
                    statusColor = '#F59E0B';
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
                          Paid: {formatCurrency(paidForThisMonth)} / {formatCurrency(installmentAmount)}
                        </Text>
                      </View>
                    </View>
                  );
                });
              })()
            ) : (
              (() => {
                const loanAmount = Number(currentLoan.loanAmount || 0);
                const totalPayable = Number(currentLoan.totalPayable) || Math.round(loanAmount * 1.08);
                const totalRepaid = Number(repaymentMeta?.totalRepaid || 0);
                const progress = Math.min(1, totalRepaid / totalPayable);

                return (
                  <View style={{ marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        One-time Payment at end of {currentLoan.loanDuration} Months
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: totalRepaid === totalPayable ? '#10B981' : '#4F46E5' }}>
                        {totalRepaid === totalPayable ? 'Fully Paid' : `${Math.round(progress * 100)}% Repaid`}
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                      <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: '#4F46E5', borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      Paid: {formatCurrency(totalRepaid)} / {formatCurrency(totalPayable)}
                    </Text>
                  </View>
                );
              })()
            )}
          </View>
        )}

        {!hasActiveLoan ? (
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>Apply for a Loan</Text>
              <Text style={styles.actionDesc}>
                Get quick manual loan disbursal ranging from ₹5,000 to ₹25,000.
              </Text>
            </View>

            {user?.kycStatus !== 'verified' && data.profileCompletion < 80 ? (
              <View style={styles.incompleteProfileContainer}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>Profile Completion: {data.profileCompletion}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${data.profileCompletion}%` }]} />
                </View>
                <Text style={styles.incompleteWarningText}>
                  ⚠️ Please complete your profile to at least 80% before applying for a loan.
                </Text>
                <Pressable
                  style={[styles.createAppBtn, { backgroundColor: '#4B5563', marginTop: 12 }]}
                  onPress={() => router.push('/profile')}
                >
                  <User size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.createAppBtnText}>Complete Profile Now</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.createAppBtn}
                onPress={() => {
                  router.push('/apply');
                }}
              >
                <PlusCircle size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.createAppBtnText}>Apply Loan</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push(`/loan/${currentLoan.id}`)}
            style={styles.trackCard}
          >
            <View style={styles.trackContent}>
              <PhoneCall size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.trackTitle}>Track Application</Text>
                <Text style={styles.trackDesc}>
                  Current Status: <Text style={{ fontWeight: '700', color: theme.primary }}>{currentLoan.status.toUpperCase().replace('_', ' ')}</Text>
                </Text>
              </View>
              <ArrowRight size={20} color={theme.textSecondary} />
            </View>
          </Pressable>
        )}

        <View style={styles.newsHeader}>
          <Text style={styles.newsTitle}>G-News</Text>
          <Text style={styles.newsSeeAll}>See all</Text>
        </View>

        <View style={styles.newsCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=2670&auto=format&fit=crop' }} 
            style={styles.newsImage} 
          />
          <View style={styles.newsOverlay}>
            <Text style={styles.newsHeadline}>New Normal Life</Text>
            <Text style={styles.newsSubHeadline}>San Francisco</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 72,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: Platform.OS === 'ios' ? 44 : 40,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  greetingLabel: {
    fontSize: 20,
    fontWeight: '400',
    color: '#333',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#F4F6F9',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },

  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  actionHeader: {
    marginBottom: 20,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  actionDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888',
    lineHeight: 20,
  },
  createAppBtn: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAppBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  trackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  trackDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  newsSeeAll: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  newsCard: {
    width: '100%',
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  newsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  newsHeadline: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  newsSubHeadline: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  incompleteProfileContainer: {
    marginTop: 12,
    width: '100%',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1A2980',
    borderRadius: 4,
  },
  incompleteWarningText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    lineHeight: 16,
  },
  // ADMIN DASHBOARD REDESIGN STYLES
  totalDisbursedCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  disbursedCardLeft: {
    flex: 1,
  },
  disbursedLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disbursedAmountText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  disbursedSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    marginTop: 4,
  },
  disbursedCardRight: {
    marginLeft: 16,
  },
  coinsIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    width: (width - 60) / 2, // 2 columns dynamically sized
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0', // Soft professional border
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, // Slightly stronger premium shadow
    shadowRadius: 10,
    elevation: 3,
  },
  gridCardContent: {
    flex: 1,
    marginRight: 8,
  },
  gridIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  gridCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
  },
  chartYAxis: {
    justifyContent: 'space-between',
    height: '80%',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    marginBottom: 16,
  },
  chartAxisText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'right',
  },
  chartPlotArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingLeft: 8,
  },
  chartBarCol: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    width: 36,
  },
  chartBarWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: 8,
    marginBottom: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  chartBarLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
  },
  chartPlaceholderText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94A3B8',
    alignSelf: 'center',
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  recentList: {
    marginBottom: 24,
  },
  recentRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  recentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentBorrowerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  recentLoanMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recentRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    padding: 4,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#6366F1',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  monthSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartFilterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chartFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  // Admin Greeting Header
  adminGreetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  adminGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  adminDateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  adminSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionCard: {
    width: (width - 60) / 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 14,
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  quickActionBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  // Recent Activity
  recentAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  recentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  recentStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyRecentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyRecentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 8,
  },
  repayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  repayCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
});


