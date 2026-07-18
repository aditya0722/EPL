import React from 'react';
import { StyleSheet, Text, View, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';
import { Loan } from '../api/services';
import { Landmark, Coins, Shield, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react-native';

interface LoanCardProps {
  currentLoan: Loan | null;
  outstandingAmount: number;
}

const { width } = Dimensions.get('window');

export const LoanCard: React.FC<LoanCardProps> = ({ currentLoan, outstandingAmount }) => {
  const theme = Colors.light;

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  // Determine card gradient colors & status badge based on loan state
  let gradientColors = ['#4F46E5', '#6366F1', '#818CF8']; // Default limit promo card
  let statusLabel = 'NO ACTIVE LOAN';
  let statusIcon = <Coins size={14} color="#FFF" />;
  let cardTitle = 'EPC PERSONAL CREDIT';

  if (currentLoan) {
    const status = currentLoan.status;
    if (status === 'disbursed') {
      gradientColors = ['#1E1B4B', '#4F46E5', '#7C3AED']; // Premium royal gradient
      statusLabel = 'ACTIVE AGREEMENT';
      statusIcon = <CheckCircle2 size={12} color="#10B981" />;
      cardTitle = 'ACTIVE LOAN';
    } else if (status === 'pending' || status === 'under_review' || status === 'documents_required') {
      gradientColors = ['#334155', '#475569', '#64748B']; // Steel slate gradient
      statusLabel = status.toUpperCase().replace('_', ' ');
      statusIcon = <Clock size={12} color="#F59E0B" />;
      cardTitle = 'APPLICATION IN REVIEW';
    } else if (status === 'approved') {
      gradientColors = ['#0D5C3A', '#10B981', '#34D399']; // Emerald green gradient
      statusLabel = 'APPROVED';
      statusIcon = <CheckCircle2 size={12} color="#FFFFFF" />;
      cardTitle = 'APPROVED & READY';
    } else if (status === 'defaulted') {
      gradientColors = ['#7F1D1D', '#DC2626', '#EF4444']; // Deep warning red
      statusLabel = 'OVERDUE';
      statusIcon = <AlertTriangle size={12} color="#FFFFFF" />;
      cardTitle = 'REPAYMENT DEFAULT';
    } else {
      gradientColors = ['#334155', '#475569'];
      statusLabel = status.toUpperCase();
      statusIcon = <Shield size={12} color="#FFF" />;
      cardTitle = 'ARCHIVED';
    }
  }

  // Rendering limit promo card
  if (!currentLoan) {
    return (
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardContainer}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.chipBrandRow}>
              <View style={styles.goldChip} />
              <Text style={styles.brandText}>{cardTitle}</Text>
            </View>
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>PREMIUM</Text>
            </View>
          </View>

          {/* Body Content */}
          <View style={styles.bodyContent}>
            <Text style={styles.limitLabel}>Instant Credit Line Limit</Text>
            <Text style={styles.limitValue}>₹25,000</Text>
          </View>

          {/* Footer Row */}
          <View style={styles.footerRow}>
            <Text style={styles.promoSubtext}>Complete KYC profile to unlock available limits</Text>
            <View style={styles.arrowCircle}>
              <ArrowRight size={14} color="#4F46E5" />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const showOutstanding = currentLoan.status === 'disbursed' || currentLoan.status === 'defaulted';

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardContainer}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.chipBrandRow}>
            <View style={styles.goldChip} />
            <Text style={styles.brandText}>{cardTitle}</Text>
          </View>
          <View style={[styles.statusBadge, currentLoan.status === 'approved' && styles.approvedBadge]}>
            {statusIcon}
            <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Body Content */}
        <View style={styles.bodyContent}>
          <Text style={styles.limitLabel}>
            {showOutstanding ? 'Total Outstanding Balance' : 'Requested Capital Amount'}
          </Text>
          <Text style={styles.limitValue}>
            {showOutstanding ? formatCurrency(outstandingAmount) : formatCurrency(currentLoan.loanAmount)}
          </Text>
        </View>

        {/* Footer Row */}
        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Text style={styles.loanIdText}>L-ID: {currentLoan.id.substring(0, 8).toUpperCase()}</Text>
            <Text style={styles.repayMetaText}>
              {currentLoan.repaymentType === 'emi' ? 'EMI Scheme' : 'Tenure End Pay'} • {currentLoan.loanDuration} Months
            </Text>
          </View>
          {showOutstanding && currentLoan.repaymentType === 'emi' && (
            <View style={styles.emiHighlightCard}>
              <Text style={styles.emiLabel}>Monthly EMI</Text>
              <Text style={styles.emiValue}>
                {formatCurrency(Math.round(Number(currentLoan.totalPayable) / Number(currentLoan.loanDuration)))}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    alignSelf: 'stretch',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
  },
  cardContainer: {
    borderRadius: 24,
    padding: 24,
    height: 190,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldChip: {
    width: 32,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ECC94B',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D69E2E',
    opacity: 0.9,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  promoBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promoBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  approvedBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  bodyContent: {
    marginVertical: 4,
  },
  limitLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  limitValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  promoSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'column',
  },
  loanIdText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  repayMetaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  emiHighlightCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'flex-end',
  },
  emiLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emiValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
});
