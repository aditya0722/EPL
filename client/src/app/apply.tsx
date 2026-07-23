import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Alert, Platform, PanResponder, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { LoanService, DocumentService } from '../api/services';
import { Colors, Spacing } from '../constants/theme';
import { Check, ChevronDown, Camera, CreditCard, DollarSign, Wallet, Calendar, Coins, Percent, FileText, User, IndianRupee } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

export default function ApplyLoanScreen() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const theme = Colors.light;
  const queryClient = useQueryClient();

  // Application State
  const [amount, setAmount] = useState(5000);
  const [scheme, setScheme] = useState<'emi' | 'normal'>('emi');
  const [duration, setDuration] = useState<number>(3); // Default 3 months
  const [sliderWidth, setSliderWidth] = useState(0);

  // Interest Calculations
  const interestRate = scheme === 'emi' ? 0.38 : (0.08 * duration); // EMI is 38% flat, Normal is 8% flat per month
  const interestAmount = Math.round(amount * interestRate);
  const totalRepayable = amount + interestAmount;
  const monthlyEmi = Math.round(totalRepayable / duration);

  // Processing fee logic: 5k-7k = 450, 8k-10k = 900
  const getProcessingFee = (amt: number) => {
    if (amt >= 5000 && amt <= 7000) return 450;
    if (amt >= 8000 && amt <= 10000) return 900;
    return 0;
  };
  const processingFee = getProcessingFee(amount);

  const dragStartAmount = React.useRef(amount);
  const sliderWidthRef = React.useRef(sliderWidth);
  const amountRef = React.useRef(amount);

  React.useEffect(() => {
    sliderWidthRef.current = sliderWidth;
  }, [sliderWidth]);

  React.useEffect(() => {
    amountRef.current = amount;
  }, [amount]);

  const handleSliderTouch = (evt: any) => {
    if (sliderWidthRef.current === 0) return;
    const touchX = evt.nativeEvent.locationX;
    const pct = Math.max(0, Math.min(1, touchX / sliderWidthRef.current));
    const minVal = 5000;
    const maxVal = 10000;
    const rawValue = minVal + pct * (maxVal - minVal);
    const rounded = Math.round(rawValue / 1000) * 1000;
    setAmount(rounded);
    dragStartAmount.current = rounded;
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleSliderTouch,
      onPanResponderMove: (evt, gestureState) => {
        if (sliderWidthRef.current === 0) return;
        const minVal = 5000;
        const maxVal = 10000;
        const range = maxVal - minVal;
        
        const pctChange = gestureState.dx / sliderWidthRef.current;
        const amountChange = pctChange * range;
        
        const newRawVal = dragStartAmount.current + amountChange;
        const clampedVal = Math.max(minVal, Math.min(maxVal, newRawVal));
        
        setAmount(Math.round(clampedVal / 1000) * 1000);
      },
    })
  ).current;

  const durationOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Steps & Success States
  const [success, setSuccess] = useState(false);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await LoanService.apply({
        loanAmount: amount,
        loanPurpose: `${scheme === 'emi' ? 'EMI Scheme' : 'Normal Scheme'} - ${duration} Months`,
        employmentType: user?.occupation || 'salaried',
        monthlyIncome: user?.monthlyIncome ? Number(user.monthlyIncome) : 30000,
        loanDuration: duration,
        repaymentType: scheme === 'emi' ? 'emi' : 'full_payment',
      });
      return res.data;
    },
    onSuccess: (newLoan) => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['loanHistory'] });
      refreshProfile();
    },
    onError: (err: any) => {
      Alert.alert('Application Failed', err.friendlyMessage || 'Unable to submit loan application. Please try again.');
    },
  });

  const handleSubmit = async () => {
    // Check mandatory photo upload first
    try {
      const docRes = await DocumentService.getUserDocuments();
      const hasSelfie = docRes.data.some((d) => d.documentType === 'selfie');
      if (!hasSelfie) {
        Alert.alert(
          'Mandatory Profile Photo Required 📸',
          'You must upload your profile photo/selfie in your profile details before applying for a loan.',
          [
            { text: 'Upload Photo', onPress: () => router.push('/(tabs)/profile') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
    } catch {
      // Continue if doc check fails silently
    }

    const profilePct = user?.profileCompletionPercentage || 0;
    const isKycApproved = user?.kycStatus === 'verified';

    if (profilePct < 100) {
      Alert.alert(
        '100% Profile Completion Required ⚠️',
        `Your profile is currently ${profilePct}% complete. You must complete 100% of your profile details before applying for a loan.`,
        [
          { text: 'Complete Profile', onPress: () => router.push('/(tabs)/profile') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (!isKycApproved) {
      Alert.alert(
        'KYC Approval Required 🛡️',
        `Your current KYC status is "${user?.kycStatus || 'pending'}". Loan applications require approved KYC verification by admin.`,
        [
          { text: 'View Documents', onPress: () => router.push('/(tabs)/profile') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    applyMutation.mutate();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'User';

  if (success) {
    return (
      <View style={[styles.successContainer, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.successContent}>
          <Text style={styles.successTitleText}>Loan Submitted Successfully</Text>
          <Text style={styles.successNameText}>{user?.fullName || 'Client'}</Text>
          <Text style={styles.successAmountText}>
            {formatCurrency(amount)}
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center', paddingHorizontal: 16 }}>
            Total Repayable: {formatCurrency(totalRepayable)} ({scheme === 'emi' ? `${formatCurrency(monthlyEmi)}/month` : 'One-time repayment'})
          </Text>

          {/* Central Success Graphic */}
          <View style={styles.graphicContainer}>
            <View style={[styles.circleRing, { width: 220, height: 220, opacity: 0.03 }]} />
            <View style={[styles.circleRing, { width: 170, height: 170, opacity: 0.05 }]} />
            <View style={[styles.circleRing, { width: 120, height: 120, opacity: 0.1 }]} />
            
            <View style={[styles.floatingIcon, { top: 20, left: 20 }]}><Calendar size={14} color="#555" /></View>
            <View style={[styles.floatingIcon, { top: 20, right: 20 }]}><IndianRupee size={14} color="#555" /></View>
            <View style={[styles.floatingIcon, { bottom: 30, left: 10 }]}><Wallet size={14} color="#555" /></View>
            <View style={[styles.floatingIcon, { bottom: 10, right: 40 }]}><CreditCard size={14} color="#555" /></View>

            <LinearGradient
              colors={['#1A2980', '#26D0CE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.checkCircle}
            >
              <Check size={36} color="#FFFFFF" strokeWidth={3} />
            </LinearGradient>
          </View>
        </View>

        <View style={styles.successFooter}>
          <Pressable style={styles.blackBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.blackBtnText}>Back to home</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(tabs)/loans')} style={styles.historyLink}>
            <Text style={styles.historyLinkText}>See loans history</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backdropArea}>
        <View style={{ padding: 24, marginTop: Platform.OS === 'ios' ? 44 : 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 20, color: '#333' }}>Hello,</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#333' }}>{firstName}</Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }}>
              <User size={20} color="#666" />
            </View>
          </View>
          <LinearGradient
            colors={['#1A2980', '#26D0CE']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ borderRadius: 20, padding: 24, height: 120, marginTop: 24 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 }}>Maximum Limit</Text>
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '700' }}>₹10,000</Text>
          </LinearGradient>
        </View>
        <View style={styles.backdropOverlay} />
      </View>

      <View style={styles.bottomSheet}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* SCHEME SELECTOR */}
          <Text style={styles.sectionTitle}>Select Repayment Scheme</Text>
          <Text style={styles.sectionSubtitle}>Choose between EMI installments or one-time repayment</Text>
          <View style={{ flexDirection: 'row', marginBottom: 24 }}>
            <Pressable
              onPress={() => { setScheme('emi'); setDuration(3); }}
              style={[
                styles.tenurePill,
                {
                  backgroundColor: scheme === 'emi' ? '#1A2980' : '#FFFFFF',
                  borderColor: scheme === 'emi' ? '#1A2980' : '#E5E7EB',
                  marginHorizontal: 4,
                  flex: 1
                }
              ]}
            >
              <Text style={{ color: scheme === 'emi' ? '#FFF' : '#666', fontWeight: '600', fontSize: 13 }}>EMI</Text>
            </Pressable>
            <Pressable
              onPress={() => setScheme('normal')}
              style={[
                styles.tenurePill,
                {
                  backgroundColor: scheme === 'normal' ? '#1A2980' : '#FFFFFF',
                  borderColor: scheme === 'normal' ? '#1A2980' : '#E5E7EB',
                  marginHorizontal: 4,
                  flex: 1
                }
              ]}
            >
              <Text style={{ color: scheme === 'normal' ? '#FFF' : '#666', fontWeight: '600', fontSize: 13 }}>Full Pay</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Select Loan Amount</Text>
          <Text style={styles.sectionSubtitle}>
            Choose your loan amount by tapping a card below or moving the slider
          </Text>

          {/* Selectable Amount Pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 16 }}>
            {[5000, 6000, 7000, 8000, 9000, 10000].map((amt) => {
              const isSelected = amount === amt;
              return (
                <Pressable
                  key={amt}
                  onPress={() => {
                    setAmount(amt);
                    dragStartAmount.current = amt;
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#1A2980' : '#E5E7EB',
                    backgroundColor: isSelected ? '#1A298010' : '#FFFFFF',
                    minWidth: 80,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: isSelected ? '#1A2980' : '#666', fontWeight: '700', fontSize: 13 }}>
                    ₹{amt.toLocaleString('en-IN')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.amountDisplay}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.amountText}>{amount.toLocaleString('en-IN')}</Text>
          </View>

          <View 
            style={styles.sliderContainer}
            onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
            {...panResponder.panHandlers}
          >
            <View style={styles.sliderTrack} pointerEvents="none" />
            <View 
              style={[
                styles.sliderThumb, 
                { 
                  left: `${((amount - 5000) / 5000) * 100}%`,
                  marginLeft: -12, // Center the thumb of width 24
                }
              ]} 
              pointerEvents="none"
            /> 
          </View>

          <View style={styles.rangeLabels}>
            <Text style={styles.rangeText}>₹5,000</Text>
            <Text style={styles.rangeText}>₹10,000</Text>
          </View>

          <View style={{ height: 24 }} />

          <Text style={styles.sectionTitle}>Select Loan Tenure</Text>
          <Text style={styles.sectionSubtitle}>
            {scheme === 'emi' ? 'Tenure is fixed for the EMI scheme' : 'Choose your repayment duration in months'}
          </Text>

          {scheme === 'emi' ? (
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View style={[styles.tenurePill, { backgroundColor: '#1A2980', borderColor: '#1A2980', width: 80, marginHorizontal: 4 }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>3 Months</Text>
              </View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', paddingRight: 16 }}>
                {durationOptions.map((opt) => {
                  const isSelected = duration === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setDuration(opt)}
                      style={[
                        styles.tenurePill,
                        {
                          backgroundColor: isSelected ? '#1A2980' : '#FFFFFF',
                          borderColor: isSelected ? '#1A2980' : '#E5E7EB',
                          width: 56,
                          marginHorizontal: 4,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tenureText,
                          {
                            color: isSelected ? '#FFFFFF' : '#666666',
                            fontWeight: isSelected ? '600' : '500',
                          },
                        ]}
                      >
                        {opt}m
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View style={{ height: 16 }} />

          {/* OFFER SUMMARY CARD */}
          <Text style={styles.sectionTitle}>Calculated Offer Details</Text>
          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#666', fontWeight: '500' }}>Duration</Text>
              <Text style={{ fontWeight: '700', color: '#333' }}>{duration} Months</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#666', fontWeight: '500' }}>Disbursal Amount</Text>
              <Text style={{ fontWeight: '700', color: '#10B981' }}>{formatCurrency(amount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#666', fontWeight: '500' }}>Payable Amount</Text>
              <Text style={{ fontWeight: '700', color: '#1A2980' }}>{formatCurrency(totalRepayable)}</Text>
            </View>
            {scheme === 'emi' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                <Text style={{ color: '#1A2980', fontWeight: '700' }}>Calculated Monthly EMI</Text>
                <Text style={{ fontWeight: '800', color: '#1D4ED8' }}>{formatCurrency(monthlyEmi)} / month</Text>
              </View>
            )}
          </View>

          {/* REPAYMENT SCHEDULE MONTH-BY-MONTH */}
          <Text style={styles.sectionTitle}>Repayment Schedule</Text>
          <View style={styles.scheduleCard}>
            {scheme === 'emi' ? (
              Array.from({ length: duration }).map((_, index) => (
                <View key={index} style={[styles.scheduleRow, index === duration - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Calendar size={14} color="#666" style={{ marginRight: 6 }} />
                    <Text style={styles.scheduleMonth}>Month {index + 1}</Text>
                  </View>
                  <Text style={styles.scheduleAmount}>{formatCurrency(monthlyEmi)}</Text>
                </View>
              ))
            ) : (
              <View style={[styles.scheduleRow, { borderBottomWidth: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={14} color="#666" style={{ marginRight: 6 }} />
                  <Text style={styles.scheduleMonth}>End of Month {duration}</Text>
                </View>
                <Text style={styles.scheduleAmount}>{formatCurrency(totalRepayable)}</Text>
              </View>
            )}
          </View>

          <View style={{ height: 28 }} />

          <Pressable style={styles.blackBtn} onPress={handleSubmit} disabled={applyMutation.isPending}>
            {applyMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.blackBtnText}>Submit Application</Text>
            )}
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  backdropArea: {
    flex: 1,
    position: 'relative',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '75%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  scrollContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  amountDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 28,
    color: '#1A2980',
    fontWeight: '700',
    marginRight: 4,
  },
  amountText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000',
  },
  sliderContainer: {
    position: 'relative',
    height: 30,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    width: '100%',
    position: 'absolute',
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#1A2980',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  tenureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tenurePill: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenureText: {
    fontSize: 13,
  },
  scheduleCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scheduleMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  scheduleAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  blackBtn: {
    backgroundColor: '#1A2980',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  blackBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // SUCCESS SCREEN STYLES
  successContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  successTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 32,
  },
  successNameText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#888',
    marginBottom: 4,
  },
  successAmountText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A2980',
    marginBottom: 40,
  },
  graphicContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleRing: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#1A2980',
  },
  floatingIcon: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A2980',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 5,
  },
  successFooter: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  historyLink: {
    marginTop: 16,
    padding: 8,
  },
  historyLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
});
