import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, RefreshControl, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { UserService, DocumentService, AdminService } from '../../api/services';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Colors, Spacing, Brand } from '../../constants/theme';
import { 
  User, Phone, MapPin, Briefcase, IndianRupee, QrCode, LogOut, CheckCircle2, Lock, 
  UploadCloud, AlertCircle, Calendar, CreditCard, Landmark, Contact, Map as MapIcon, 
  Search, ChevronDown, ChevronRight, X, Clock, XCircle, ShieldCheck, Shield, Mail, Users, Info
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

function AdminUsersView({ logout, theme, router }: { logout: () => void; theme: any; router: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | 'verified' | 'submitted' | 'pending' | 'rejected'>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsersList'],
    queryFn: async () => {
      const res = await AdminService.getUsers();
      return res.data || [];
    }
  });

  // Fetch all loans so we can show user's loans
  const { data: loans = [], isLoading: loadingLoans, refetch: refetchLoans } = useQuery({
    queryKey: ['adminAllLoans'],
    queryFn: async () => {
      const res = await AdminService.getLoans();
      return res.data || [];
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchUsers();
      await refetchLoans();
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getKycStatusStyle = (status: string) => {
    switch (status) {
      case 'verified': return { bg: '#D1FAE5', color: '#065F46' };
      case 'submitted': return { bg: '#FEF3C7', color: '#D97706' };
      case 'pending': return { bg: '#F1F5F9', color: '#475569' };
      case 'rejected': return { bg: '#FEE2E2', color: '#B91C1C' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  const getLoanStatusStyle = (status: string) => {
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

  // Filter users
  const filteredUsers = users.filter((u: any) => {
    if (kycFilter !== 'all' && u.kycStatus !== kycFilter) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.mobileNumber?.includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Are you sure you want to log out?');
      if (confirmLogout) logout();
    } else {
      Alert.alert('Logout', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.adminContainer, { backgroundColor: '#F8FAFC' }]}
    >
      {/* Header */}
      <View style={styles.adminHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.adminTitle}>System Users</Text>
          <Text style={styles.adminSubtitle}>Manage borrowers and review active accounts</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color="#EF4444" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.adminSearchBar}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by name, email, or mobile..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
            style={styles.adminSearchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'verified', 'submitted', 'pending', 'rejected'] as const).map((filter) => {
            const isActive = kycFilter === filter;
            const count = users.filter((u: any) => filter === 'all' || u.kycStatus === filter).length;
            return (
              <Pressable
                key={filter}
                onPress={() => setKycFilter(filter)}
                style={[styles.adminFilterChip, isActive && styles.adminFilterChipActive]}
              >
                <Text style={[styles.adminFilterChipText, isActive && styles.adminFilterChipTextActive]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
                {count > 0 && (
                  <View style={[styles.adminFilterChipBadge, isActive && styles.adminFilterChipBadgeActive]}>
                    <Text style={[styles.adminFilterChipBadgeText, isActive && { color: '#4F46E5' }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.adminScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {loadingUsers || loadingLoans ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Fetching database users...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? 'Try a different search query' : `No registered users found in the system.`}
            </Text>
          </View>
        ) : (
          filteredUsers.map((u: any) => {
            const kycStyle = getKycStatusStyle(u.kycStatus);
            const userLoans = loans.filter((l: any) => l.loan.userId === u.id);
            const isExpanded = expandedUserId === u.id;
            const hasActiveLoan = userLoans.some((l: any) => ['pending', 'approved', 'disbursed', 'defaulted'].includes(l.loan.status));

            return (
              <View key={u.id} style={[styles.userCard, isExpanded && styles.userCardExpanded]}>
                {/* Compact Row */}
                <Pressable
                  style={styles.userCardHeader}
                  onPress={() => setExpandedUserId(isExpanded ? null : u.id)}
                >
                  <View style={[styles.userAvatar, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={styles.userAvatarText}>{getInitials(u.fullName)}</Text>
                  </View>
                  <View style={styles.userSummaryInfo}>
                    <Text style={styles.userNameText} numberOfLines={1}>{u.fullName || 'New User'}</Text>
                    <Text style={styles.userMetaText}>{u.mobileNumber || 'No phone number'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.statusBadge, { backgroundColor: kycStyle.bg, marginBottom: 4 }]}>
                      <Text style={[styles.statusBadgeText, { color: kycStyle.color }]}>
                        KYC {u.kycStatus.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.userLoansCountText}>
                      {userLoans.length} loan{userLoans.length !== 1 ? 's' : ''} {hasActiveLoan && '• Active 🔵'}
                    </Text>
                  </View>
                  <ChevronDown
                    size={16}
                    color="#94A3B8"
                    style={{ marginLeft: 8, transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                  />
                </Pressable>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedDetailsContainer}>
                    <View style={styles.expandDivider} />

                    {/* Section: Personal Info */}
                    <Text style={styles.detailSectionHeader}>Personal Information</Text>
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>Email</Text>
                        <Text style={styles.detailsValue} numberOfLines={1}>{u.email}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>DOB</Text>
                        <Text style={styles.detailsValue}>{u.dob ? new Date(u.dob).toLocaleDateString('en-IN') : 'Not provided'}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>Gender</Text>
                        <Text style={styles.detailsValue}>{u.gender ? u.gender.toUpperCase() : 'Not provided'}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>Emergency Contact</Text>
                        <Text style={styles.detailsValue}>{u.emergencyContact || 'Not provided'}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>Aadhaar</Text>
                        <Text style={styles.detailsValue}>{u.aadhaarNumber || 'Not provided'}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>PAN</Text>
                        <Text style={styles.detailsValue}>{u.panNumber || 'Not provided'}</Text>
                      </View>
                    </View>

                    {/* Section: Address Info */}
                    <Text style={styles.detailSectionHeader}>Address</Text>
                    <View style={styles.addressBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                        <MapPin size={14} color="#64748B" style={{ marginRight: 6, marginTop: 2 }} />
                        <Text style={styles.addressValueText}>{u.address || 'Address not updated'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 20 }}>
                        <View>
                          <Text style={styles.detailsLabel}>District</Text>
                          <Text style={styles.detailsValue}>{u.district || 'N/A'}</Text>
                        </View>
                        <View>
                          <Text style={styles.detailsLabel}>State</Text>
                          <Text style={styles.detailsValue}>{u.state || 'N/A'}</Text>
                        </View>
                        <View>
                          <Text style={styles.detailsLabel}>Pincode</Text>
                          <Text style={styles.detailsValue}>{u.pincode || 'N/A'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Section: Employment */}
                    <Text style={styles.detailSectionHeader}>Employment & Financials</Text>
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>Occupation</Text>
                        <Text style={styles.detailsValue}>{u.occupation || 'Not provided'}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>Monthly Income</Text>
                        <Text style={styles.detailsValue}>{u.monthlyIncome ? formatCurrency(u.monthlyIncome) : 'Not provided'}</Text>
                      </View>
                    </View>

                    {/* Section: Bank details */}
                    <Text style={styles.detailSectionHeader}>Bank Account & Payments</Text>
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>Bank Name</Text>
                        <Text style={styles.detailsValue}>{u.bankName || 'Not provided'}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>Account No</Text>
                        <Text style={styles.detailsValue}>{u.bankAccountNo || 'Not provided'}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>IFSC Code</Text>
                        <Text style={styles.detailsValue}>{u.bankIfsc || 'Not provided'}</Text>
                      </View>
                      <View style={styles.detailsGridItem}>
                        <Text style={styles.detailsLabel}>UPI ID</Text>
                        <Text style={styles.detailsValue}>{u.upiId || 'Not provided'}</Text>
                      </View>
                    </View>

                    {/* Section: Loans details */}
                    <Text style={styles.detailSectionHeader}>Loans List</Text>
                    {userLoans.length === 0 ? (
                      <View style={styles.noLoansBox}>
                        <Info size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                        <Text style={styles.noLoansText}>User hasn't applied for any loans yet.</Text>
                      </View>
                    ) : (
                      userLoans.map((item: any) => {
                        const { loan } = item;
                        const loanStatus = getLoanStatusStyle(loan.status);
                        const loanDate = new Date(loan.createdAt).toLocaleDateString('en-IN');
                        return (
                          <View key={loan.id} style={styles.userLoanMiniCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.userLoanAmount}>{formatCurrency(loan.loanAmount)}</Text>
                              <View style={[styles.statusBadge, { backgroundColor: loanStatus.bg }]}>
                                <Text style={[styles.statusBadgeText, { color: loanStatus.color }]}>
                                  {loan.status.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.loanCardDivider} />
                            <View style={styles.userLoanDetailsRow}>
                              <Text style={styles.userLoanDetailCol}>Applied: {loanDate}</Text>
                              <Text style={styles.userLoanDetailCol}>Tenure: {loan.loanDuration} Months</Text>
                              <Text style={styles.userLoanDetailCol}>{loan.repaymentType === 'emi' ? 'EMI' : 'Full Payment'}</Text>
                            </View>
                            <Text style={styles.userLoanPurpose}>Purpose: {loan.loanPurpose}</Text>
                          </View>
                        );
                      })
                    )}

                    {/* KYC Document Verification Quick Link */}
                    {u.kycStatus === 'submitted' && (
                      <Pressable
                        style={styles.kycRedirectBtn}
                        onPress={() => router.push({ pathname: '/(tabs)/admin', params: { tab: 'kyc' } })}
                      >
                        <Shield size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.kycRedirectText}>Review Uploaded KYC Documents</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const isAdmin = user?.role === 'admin';

  if (isAdmin) {
    return <AdminUsersView logout={logout} theme={theme} router={router} />;
  }

  // React state hooks for Profile fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || '');
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '');
  const [gender, setGender] = useState(user?.gender || '');
  const [panNumber, setPanNumber] = useState(user?.panNumber || '');
  const [aadhaarNumber, setAadhaarNumber] = useState(user?.aadhaarNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [stateVal, setStateVal] = useState(user?.state || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthlyIncome ? String(Math.round(Number(user.monthlyIncome))) : '');
  const [bankAccountNo, setBankAccountNo] = useState(user?.bankAccountNo || '');
  const [bankIfsc, setBankIfsc] = useState(user?.bankIfsc || '');
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || '');

  // QR Code Document URL state
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Form states
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch QR Code Document URL on load
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await DocumentService.getUserDocuments();
        const qrDoc = response.data.find((d) => d.documentType === 'other');
        if (qrDoc) {
          setQrCodeUrl(qrDoc.cloudinaryUrl);
        }
      } catch (err) {
        console.log('Error fetching user QR document', err);
      }
    };
    fetchDocuments();
  }, []);

  const handlePickQrCode = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access gallery is required to upload QR Code');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const fileName = fileUri.split('/').pop() || 'qrcode.jpg';
        const fileType = asset.mimeType || 'image/jpeg';

        setQrLoading(true);
        setGlobalError(null);
        setFieldErrors((prev) => ({ ...prev, qrCode: '', payment: '' }));

        const uploadRes = await DocumentService.uploadQrCode(fileUri, fileName, fileType);
        setQrCodeUrl(uploadRes.data.cloudinaryUrl);
        
        // Refresh global profile completion state
        await refreshProfile();
        Alert.alert('Success', 'QR Code uploaded successfully!');
      }
    } catch (err: any) {
      setGlobalError(err.friendlyMessage || 'Failed to upload QR Code image.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleSave = async () => {
    // Reset errors
    let errors: Record<string, string> = {};
    setGlobalError(null);
    setSuccess(false);

    // Front-end Validations
    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters.';
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!mobileNumber || !phoneRegex.test(mobileNumber)) {
      errors.mobileNumber = 'Invalid mobile number (e.g. +919999999999)';
    }

    if (!dob || dob.trim().length === 0) {
      errors.dob = 'Date of Birth is required.';
    }

    if (!gender || !['male', 'female', 'other'].includes(gender)) {
      errors.gender = 'Gender is required (male, female, or other).';
    }

    if (!address || address.trim().length < 5) {
      errors.address = 'Address must be at least 5 characters.';
    }

    if (!stateVal || stateVal.trim().length < 2) {
      errors.stateVal = 'State is required.';
    }

    if (!district || district.trim().length < 2) {
      errors.district = 'District is required.';
    }

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits.';
    }

    if (!occupation || occupation.trim().length < 2) {
      errors.occupation = 'Occupation is required.';
    }

    if (!monthlyIncome || isNaN(Number(monthlyIncome)) || Number(monthlyIncome) <= 0) {
      errors.monthlyIncome = 'Monthly income must be a positive number.';
    }

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      errors.aadhaarNumber = 'Aadhaar must be exactly 12 digits.';
    }

    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
      errors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    if (!bankAccountNo || bankAccountNo.trim().length < 9) {
      errors.bankAccountNo = 'Bank account number must be at least 9 digits.';
    }

    if (!bankIfsc || bankIfsc.trim().length !== 11) {
      errors.bankIfsc = 'IFSC code must be exactly 11 characters.';
    }

    if (!bankName || bankName.trim().length < 2) {
      errors.bankName = 'Bank name is required.';
    }

    if (!emergencyContact || emergencyContact.trim().length < 10) {
      errors.emergencyContact = 'Emergency Contact must be a valid 10-digit number.';
    }

    // Explicit check: Either UPI ID or QR Code must be provided
    if (!upiId && !qrCodeUrl) {
      errors.payment = 'You must provide either a UPI ID or upload a Payment QR Code.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Alert.alert('Validation Error', 'Please correct the highlighted errors before saving.');
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      const profileData: any = {
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        dob: new Date(dob).toISOString(),
        gender,
        address: address.trim(),
        state: stateVal.trim(),
        district: district.trim(),
        pincode: pincode.trim(),
        occupation: occupation.trim(),
        monthlyIncome: Number(monthlyIncome),
        aadhaarNumber: aadhaarNumber.trim(),
        bankAccountNo: bankAccountNo.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        bankName: bankName.trim(),
        upiId: upiId.trim(),
        emergencyContact: emergencyContact.trim(),
      };

      if (panNumber && panNumber.trim().length > 0) {
        profileData.panNumber = panNumber.trim().toUpperCase();
      }

      await UserService.updateProfile(profileData);
      await refreshProfile();
      setSuccess(true);
      Alert.alert('Success', 'Profile details updated successfully!');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setGlobalError(err.friendlyMessage || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Are you sure you want to log out?');
      if (confirmLogout) {
        logout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'U';

  const completionPercent = user?.profileCompletionPercentage || 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: '#F4F6F9' }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* HERO SECTION */}
        <LinearGradient
          colors={['#1A2980', '#26D0CE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroHeader}
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{user?.fullName || 'User Profile'}</Text>
          <View style={styles.heroBadge}>
            <CheckCircle2 size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.heroBadgeText}>KYC {user?.kycStatus.toUpperCase()}</Text>
          </View>

          {/* PROGRESS INDICATOR CARD */}
          <View style={styles.progressOverlayCard}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressOverlayLabel}>Profile Completion</Text>
              <Text style={styles.progressOverlayVal}>{completionPercent}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${completionPercent}%` }]} />
            </View>
            <Text style={styles.progressOverlaySub}>
              {completionPercent < 100 
                ? 'Complete your profile details to 100% to unlock loan applications.'
                : 'Your profile is fully complete! You are ready to apply for loans.'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.contentPadding}>
          {/* Global Alerts */}
          {!!globalError && (
            <View style={[styles.alertBox, { backgroundColor: theme.error + '1A' }]}>
              <AlertCircle size={18} color={theme.error} style={{ marginRight: 8 }} />
              <Text style={[styles.alertText, { color: theme.error }]}>{globalError}</Text>
            </View>
          )}

          {success && (
            <View style={[styles.alertBox, { backgroundColor: theme.success + '1A' }]}>
              <CheckCircle2 size={18} color={theme.success} style={{ marginRight: 8 }} />
              <Text style={[styles.alertText, { color: theme.success }]}>Profile updated successfully!</Text>
            </View>
          )}

          {/* SECTION 1: PERSONAL DETAILS */}
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.glassCard}>
            <InputField
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={(text) => { setFullName(text); setFieldErrors({...fieldErrors, fullName: ''}); }}
              icon={<User size={20} color={theme.textSecondary} />}
              error={fieldErrors.fullName}
            />

            <InputField
              label="Mobile Number"
              placeholder="+91XXXXXXXXXX"
              keyboardType="phone-pad"
              value={mobileNumber}
              onChangeText={(text) => { setMobileNumber(text); setFieldErrors({...fieldErrors, mobileNumber: ''}); }}
              icon={<Phone size={20} color={theme.textSecondary} />}
              error={fieldErrors.mobileNumber}
            />

            <InputField
              label="Date of Birth (YYYY-MM-DD)"
              placeholder="1995-08-25"
              value={dob}
              onChangeText={(text) => { setDob(text); setFieldErrors({...fieldErrors, dob: ''}); }}
              icon={<Calendar size={20} color={theme.textSecondary} />}
              error={fieldErrors.dob}
            />

            <InputField
              label="Gender (male / female / other)"
              placeholder="male"
              value={gender}
              onChangeText={(text) => { setGender(text.toLowerCase()); setFieldErrors({...fieldErrors, gender: ''}); }}
              icon={<User size={20} color={theme.textSecondary} />}
              error={fieldErrors.gender}
            />

            <InputField
              label="Aadhaar Number (12 digits)"
              placeholder="123456789012"
              keyboardType="numeric"
              maxLength={12}
              value={aadhaarNumber}
              onChangeText={(text) => { setAadhaarNumber(text); setFieldErrors({...fieldErrors, aadhaarNumber: ''}); }}
              icon={<CreditCard size={20} color={theme.textSecondary} />}
              error={fieldErrors.aadhaarNumber}
            />

            <InputField
              label="PAN Card Number (Optional)"
              placeholder="ABCDE1234F"
              maxLength={10}
              autoCapitalize="characters"
              value={panNumber}
              onChangeText={(text) => { setPanNumber(text); setFieldErrors({...fieldErrors, panNumber: ''}); }}
              icon={<CreditCard size={20} color={theme.textSecondary} />}
              error={fieldErrors.panNumber}
            />

            <InputField
              label="Emergency Contact Number"
              placeholder="9999999999"
              keyboardType="phone-pad"
              value={emergencyContact}
              onChangeText={(text) => { setEmergencyContact(text); setFieldErrors({...fieldErrors, emergencyContact: ''}); }}
              icon={<Contact size={20} color={theme.textSecondary} />}
              error={fieldErrors.emergencyContact}
            />
          </View>

          {/* SECTION 2: ADDRESS DETAILS */}
          <Text style={styles.sectionTitle}>Address Details</Text>
          <View style={styles.glassCard}>
            <InputField
              label="Permanent Address"
              placeholder="Enter home/shop address"
              multiline
              numberOfLines={2}
              value={address}
              onChangeText={(text) => { setAddress(text); setFieldErrors({...fieldErrors, address: ''}); }}
              icon={<MapPin size={20} color={theme.textSecondary} />}
              error={fieldErrors.address}
            />

            <InputField
              label="District"
              placeholder="Pune / Mumbai"
              value={district}
              onChangeText={(text) => { setDistrict(text); setFieldErrors({...fieldErrors, district: ''}); }}
              icon={<MapIcon size={20} color={theme.textSecondary} />}
              error={fieldErrors.district}
            />

            <InputField
              label="State"
              placeholder="Maharashtra"
              value={stateVal}
              onChangeText={(text) => { setStateVal(text); setFieldErrors({...fieldErrors, stateVal: ''}); }}
              icon={<MapIcon size={20} color={theme.textSecondary} />}
              error={fieldErrors.stateVal}
            />

            <InputField
              label="Pincode (6 digits)"
              placeholder="411001"
              keyboardType="numeric"
              maxLength={6}
              value={pincode}
              onChangeText={(text) => { setPincode(text); setFieldErrors({...fieldErrors, pincode: ''}); }}
              icon={<MapPin size={20} color={theme.textSecondary} />}
              error={fieldErrors.pincode}
            />
          </View>

          {/* SECTION 3: EMPLOYMENT DETAILS */}
          <Text style={styles.sectionTitle}>Employment Details</Text>
          <View style={styles.glassCard}>
            <InputField
              label="Occupation"
              placeholder="Shopkeeper, Farmer, Driver, etc"
              value={occupation}
              onChangeText={(text) => { setOccupation(text); setFieldErrors({...fieldErrors, occupation: ''}); }}
              icon={<Briefcase size={20} color={theme.textSecondary} />}
              error={fieldErrors.occupation}
            />

            <InputField
              label="Monthly Income"
              placeholder="25000"
              keyboardType="numeric"
              value={monthlyIncome}
              onChangeText={(text) => { setMonthlyIncome(text); setFieldErrors({...fieldErrors, monthlyIncome: ''}); }}
              icon={<IndianRupee size={20} color={theme.textSecondary} />}
              error={fieldErrors.monthlyIncome}
            />
          </View>

          {/* SECTION 4: BANK ACCOUNT & TRANSFER DETAILS */}
          <Text style={styles.sectionTitle}>Bank Account details</Text>
          <View style={styles.glassCard}>
            <InputField
              label="Bank Name"
              placeholder="State Bank of India"
              value={bankName}
              onChangeText={(text) => { setBankName(text); setFieldErrors({...fieldErrors, bankName: ''}); }}
              icon={<Landmark size={20} color={theme.textSecondary} />}
              error={fieldErrors.bankName}
            />

            <InputField
              label="Account Number"
              placeholder="30004561237"
              keyboardType="numeric"
              value={bankAccountNo}
              onChangeText={(text) => { setBankAccountNo(text); setFieldErrors({...fieldErrors, bankAccountNo: ''}); }}
              icon={<CreditCard size={20} color={theme.textSecondary} />}
              error={fieldErrors.bankAccountNo}
            />

            <InputField
              label="IFSC Code"
              placeholder="SBIN0001234"
              autoCapitalize="characters"
              maxLength={11}
              value={bankIfsc}
              onChangeText={(text) => { setBankIfsc(text); setFieldErrors({...fieldErrors, bankIfsc: ''}); }}
              icon={<Landmark size={20} color={theme.textSecondary} />}
              error={fieldErrors.bankIfsc}
            />
          </View>

          {/* SECTION 5: MANUALLY RECEIVE MONEY OPTIONS */}
          <Text style={styles.sectionTitle}>Receive Money Options</Text>
          <View style={styles.glassCard}>
            {!!fieldErrors.payment && (
              <View style={styles.inlineErrorBox}>
                <AlertCircle size={14} color={theme.error} style={{ marginRight: 6 }} />
                <Text style={styles.inlineErrorText}>{fieldErrors.payment}</Text>
              </View>
            )}

            <InputField
              label="UPI ID (e.g. name@paytm)"
              placeholder="someone@upi"
              value={upiId}
              onChangeText={(text) => { setUpiId(text); setFieldErrors({...fieldErrors, upiId: '', payment: ''}); }}
              icon={<User size={20} color={theme.textSecondary} />}
              error={fieldErrors.upiId}
            />

            <View style={styles.qrHeader}>
              <Text style={styles.qrLabel}>QR Code Image (Optional)</Text>
            </View>

            {qrLoading ? (
              <View style={styles.qrPlaceholder}>
                <ActivityIndicator size="large" color="#1A2980" />
                <Text style={{ marginTop: 8, color: '#666' }}>Uploading...</Text>
              </View>
            ) : qrCodeUrl ? (
              <View style={styles.qrImageContainer}>
                <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} contentFit="contain" />
                <Pressable onPress={handlePickQrCode} style={styles.replaceQrBtn}>
                  <UploadCloud size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.replaceQrText}>Replace Image</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handlePickQrCode} style={styles.qrUploadBox}>
                <View style={styles.qrUploadIconBg}>
                  <QrCode size={28} color="#1A2980" />
                </View>
                <Text style={styles.qrUploadText}>Tap to Upload QR Code</Text>
                <Text style={styles.qrUploadSub}>Allows admin to manually transfer funds</Text>
              </Pressable>
            )}
          </View>

          <PrimaryButton
            title="Save Profile Details"
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />

          {/* SECTION 6: SECURITY & ACCOUNT */}
          <Text style={styles.sectionTitle}>Security & Account</Text>
          <View style={styles.glassCard}>
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.menuIconBg}>
                <Lock size={18} color="#555" />
              </View>
              <Text style={styles.menuText}>Change Password</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.menuIconBg, { backgroundColor: '#FEE2E2' }]}>
                <LogOut size={18} color="#EF4444" />
              </View>
              <Text style={[styles.menuText, { color: '#EF4444' }]}>Log Out Session</Text>
            </Pressable>
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 110,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#1A2980',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 80,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressOverlayCard: {
    position: 'absolute',
    bottom: -60,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressOverlayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  progressOverlayVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2980',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1A2980',
    borderRadius: 5,
  },
  progressOverlaySub: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  contentPadding: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  glassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  qrHeader: {
    marginTop: 12,
    marginBottom: 12,
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  qrUploadBox: {
    height: 150,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  qrUploadIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrUploadText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  qrUploadSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
  },
  qrPlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
  },
  qrImageContainer: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  replaceQrBtn: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  replaceQrText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    marginBottom: 24,
    height: 56,
    borderRadius: 28,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  inlineErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  adminContainer: {
    flex: 1,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  adminTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  adminSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  adminSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    height: '100%',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterScroll: {
    gap: 8,
  },
  adminFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminFilterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  adminFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  adminFilterChipTextActive: {
    color: '#FFFFFF',
  },
  adminFilterChipBadge: {
    marginLeft: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 18,
    alignItems: 'center',
  },
  adminFilterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  adminFilterChipBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  adminScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  userCardExpanded: {
    borderColor: '#4F46E5',
    borderWidth: 1.5,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  userSummaryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  userMetaText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  userLoansCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  expandedDetailsContainer: {
    marginTop: 8,
  },
  detailSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailsGridItem: {
    width: '50%',
    marginBottom: 8,
  },
  detailsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  detailsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressValueText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 16,
  },
  noLoansBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  noLoansText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  userLoanMiniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userLoanAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  loanCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  userLoanDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userLoanDetailCol: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  userLoanPurpose: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  kycRedirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  kycRedirectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
  expandDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
});
