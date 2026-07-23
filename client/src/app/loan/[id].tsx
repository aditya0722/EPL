import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform, Alert, Pressable, ActivityIndicator, Modal, TextInput, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LoanService, RepaymentService, DocumentService } from '../../api/services';
import { Timeline } from '../../components/Timeline';
import { StatusBadge } from '../../components/StatusBadge';
import { Colors, Brand, Spacing } from '../../constants/theme';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { cleanPurpose } from '../../utils/formatters';
import { IndianRupee, FileText, Calendar, Clock, CreditCard, CheckCircle2, Info, ArrowLeft, UploadCloud, X, AlertCircle, XCircle, Wallet, Landmark, Banknote, MoreHorizontal } from 'lucide-react-native';

export default function LoanDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = Colors.light;

  // Repayment Modal state
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank_transfer' | 'cash' | 'other'>('upi');
  const [transactionRef, setTransactionRef] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [repayError, setRepayError] = useState<string | null>(null);

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

  // Open modal handler
  const handleOpenRepayModal = () => {
    const duration = loan?.loanDuration || 3;
    const installmentAmount = Math.round(totalPayable / duration) || 1;
    const amountToPay = loan?.repaymentType === 'emi' ? Math.min(installmentAmount, outstandingAmount) : outstandingAmount;

    if (amountToPay <= 0) {
      Alert.alert('Info', 'Your loan has already been fully repaid.');
      return;
    }

    setRepayAmount(amountToPay.toString());
    setPaymentMethod('upi');
    setTransactionRef('');
    setScreenshotUrl('');
    setRemarks('');
    setRepayError(null);
    setShowRepayModal(true);
  };

  // Pick Payment Receipt Screenshot
  const handlePickScreenshot = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access gallery is required to upload payment screenshot.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const fileName = fileUri.split('/').pop() || 'payment_screenshot.jpg';
        const fileType = asset.mimeType || 'image/jpeg';

        setUploadingScreenshot(true);
        setRepayError(null);
        // Display local image preview immediately
        setScreenshotUrl(fileUri);

        const uploadRes = await DocumentService.uploadQrCode(fileUri, fileName, fileType);
        if (uploadRes?.data?.cloudinaryUrl) {
          setScreenshotUrl(uploadRes.data.cloudinaryUrl);
        }
      }
    } catch (err: any) {
      setRepayError(err.friendlyMessage || err.message || 'Failed to upload screenshot. Please try again.');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  // Submit manual repayment with screenshot and transaction ref
  const handleSubmitRepayment = async () => {
    setRepayError(null);
    const amt = Number(repayAmount);

    if (!repayAmount || isNaN(amt) || amt <= 0) {
      setRepayError('Please enter a valid repayment amount.');
      return;
    }

    if (!transactionRef || transactionRef.trim().length < 5) {
      setRepayError('Transaction Number / UTR is required (min 5 characters).');
      return;
    }

    if (!screenshotUrl) {
      setRepayError('Payment screenshot upload is required.');
      return;
    }

    setSubmittingPayment(true);
    try {
      await RepaymentService.makeRepayment({
        loanId: loan.id,
        amount: amt,
        paymentMethod,
        transactionRef: transactionRef.trim(),
        screenshotUrl,
        remarks: remarks.trim() || undefined,
      });

      setShowRepayModal(false);
      Alert.alert(
        'Payment Submitted ⏳',
        'Your payment request has been submitted successfully and is waiting for admin verification.',
        [{ text: 'OK', onPress: () => refetch() }]
      );
      refetch();
    } catch (err: any) {
      setRepayError(err.friendlyMessage || 'Failed to submit payment. Please try again.');
    } finally {
      setSubmittingPayment(false);
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Application Details</Text>
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
              <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Payable Loan Amount</Text>
              <Text style={[styles.amountValue, { color: theme.text }]}>{formatAmount(totalPayable)}</Text>
            </View>
            <StatusBadge status={loan.status} />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.summaryGrid}>
            <View style={styles.gridCol}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Scheme / Purpose</Text>
              <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={1}>
                {cleanPurpose(loan.loanPurpose)}
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
              <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Repayment Scheme</Text>
              <Text style={[styles.gridValue, { color: theme.text }]}>
                {loan.repaymentType === 'emi' ? 'EMI Scheme' : 'Normal Scheme'}
              </Text>
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
                  <Text style={[styles.repayLabel, { color: theme.textSecondary }]}>Total Paid (Verified)</Text>
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
                  style={styles.payNowBtn}
                  onPress={handleOpenRepayModal}
                >
                  <Text style={styles.payNowBtnText}>Repay Loan (Pay Now)</Text>
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
                        statusText = `Partially Paid (${formatAmount(remainingForThisMonth)} remaining)`;
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
                  No repayment requests recorded yet.
                </Text>
              ) : (
                repayments.map((repayment: any) => {
                  const isPending = repayment.status === 'pending';
                  const isCompleted = repayment.status === 'completed';
                  const isFailed = repayment.status === 'failed';

                  let badgeBg = '#FEF3C7';
                  let badgeTextColor = '#D97706';
                  let badgeText = 'PENDING VERIFICATION';

                  if (isCompleted) {
                    badgeBg = '#D1FAE5';
                    badgeTextColor = '#065F46';
                    badgeText = 'APPROVED';
                  } else if (isFailed) {
                    badgeBg = '#FEE2E2';
                    badgeTextColor = '#B91C1C';
                    badgeText = 'REJECTED';
                  }

                  return (
                    <View key={repayment.id} style={styles.repaymentRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <CreditCard size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                            <Text style={[styles.repayRowTitle, { color: theme.text }]} numberOfLines={1}>
                              Payment ({repayment.paymentMethod.toUpperCase()})
                            </Text>
                          </View>
                          <Text style={[styles.repayRowAmt, { color: isCompleted ? theme.success : isFailed ? theme.error : '#D97706' }]}>
                            {formatAmount(repayment.amount)}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                          <Text style={[styles.repayRowSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                            Ref: {repayment.transactionRef} • {formatDate(repayment.paymentDate)}
                          </Text>
                          <View style={[styles.statusBadgeSmall, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.statusBadgeSmallText, { color: badgeTextColor }]}>
                              {badgeText}
                            </Text>
                          </View>
                        </View>

                        {/* Screenshot thumbnail if available */}
                        {repayment.screenshotUrl && (
                          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                            <Image
                              source={{ uri: repayment.screenshotUrl }}
                              style={styles.historyReceiptThumb}
                              resizeMode="cover"
                            />
                            <Text style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>
                              Receipt Screenshot Uploaded
                            </Text>
                          </View>
                        )}

                        {/* Rejection remarks if failed */}
                        {isFailed && repayment.remarks && (
                          <View style={styles.rejectionBox}>
                            <AlertCircle size={12} color="#DC2626" style={{ marginRight: 4 }} />
                            <Text style={styles.rejectionText}>
                              Remarks: {repayment.remarks}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* REPAYMENT SUBMISSION MODAL */}
      <Modal
        visible={showRepayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!submittingPayment && !uploadingScreenshot) {
            setShowRepayModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Wallet size={20} color="#4F46E5" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Submit Loan Repayment</Text>
              </View>
              <Pressable
                onPress={() => setShowRepayModal(false)}
                disabled={submittingPayment || uploadingScreenshot}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
              {/* Info banner */}
              <View style={styles.modalInfoBanner}>
                <Info size={16} color="#0284C7" style={{ marginRight: 8 }} />
                <Text style={styles.modalInfoBannerText}>
                  Please transfer the amount via UPI / Bank Transfer and submit the Transaction Ref & Receipt screenshot below for admin approval.
                </Text>
              </View>

              {repayError && (
                <View style={styles.modalErrorBanner}>
                  <AlertCircle size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.modalErrorText}>{repayError}</Text>
                </View>
              )}

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Repayment Amount (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={repayAmount}
                  onChangeText={setRepayAmount}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Payment Method Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method *</Text>
                <View style={styles.methodRow}>
                  {[
                    { key: 'upi', label: 'UPI' },
                    { key: 'bank_transfer', label: 'Bank Transfer' },
                    { key: 'cash', label: 'Cash' },
                    { key: 'other', label: 'Other' },
                  ].map((item) => {
                    const isSelected = paymentMethod === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.methodChip, isSelected && styles.methodChipSelected]}
                        onPress={() => setPaymentMethod(item.key as any)}
                      >
                        <Text style={[styles.methodChipText, isSelected && styles.methodChipTextSelected]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Transaction Reference Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Transaction Ref / UTR Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={transactionRef}
                  onChangeText={setTransactionRef}
                  placeholder="e.g. UPI Ref ID / UTR / Txn Number"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
                <Text style={styles.inputHelp}>Enter the 12-digit UTR or transaction ID from your payment receipt.</Text>
              </View>

              {/* Payment Screenshot Upload */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Receipt Screenshot *</Text>
                
                {screenshotUrl ? (
                  <View style={styles.uploadedReceiptCard}>
                    <Image source={{ uri: screenshotUrl }} style={styles.receiptPreviewImage} resizeMode="contain" />
                    <View style={styles.receiptUploadedRow}>
                      <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={styles.receiptUploadedText}>Screenshot Uploaded</Text>
                      <Pressable onPress={handlePickScreenshot} disabled={uploadingScreenshot} style={styles.changeReceiptBtn}>
                        <Text style={styles.changeReceiptText}>Change</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={styles.uploadBox}
                    onPress={handlePickScreenshot}
                    disabled={uploadingScreenshot}
                  >
                    {uploadingScreenshot ? (
                      <View style={{ alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#4F46E5" />
                        <Text style={styles.uploadingText}>Uploading screenshot...</Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <UploadCloud size={32} color="#4F46E5" />
                        <Text style={styles.uploadBoxTitle}>Tap to Upload Payment Screenshot</Text>
                        <Text style={styles.uploadBoxSub}>Select image from gallery (JPG, PNG)</Text>
                      </View>
                    )}
                  </Pressable>
                )}
              </View>

              {/* User Remarks */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Remarks / Notes (Optional)</Text>
                <TextInput
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="e.g. Paid via GPay / PhonePe"
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowRepayModal(false)}
                disabled={submittingPayment || uploadingScreenshot}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalSubmitBtn, (submittingPayment || uploadingScreenshot) && { opacity: 0.6 }]}
                onPress={handleSubmitRepayment}
                disabled={submittingPayment || uploadingScreenshot}
              >
                {submittingPayment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Repayment</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  repayRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  repayRowSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  repayRowAmt: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  historyReceiptThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  rejectionText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
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

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 14,
  },
  modalInfoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
    fontWeight: '500',
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputHelp: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  methodChipSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  methodChipTextSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C7D2FE',
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338CA',
    marginTop: 8,
  },
  uploadBoxSub: {
    fontSize: 11,
    color: '#6366F1',
    marginTop: 2,
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 8,
  },
  uploadedReceiptCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  receiptPreviewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 8,
  },
  receiptUploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  receiptUploadedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    flex: 1,
  },
  changeReceiptBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E0E7FF',
    borderRadius: 6,
  },
  changeReceiptText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
