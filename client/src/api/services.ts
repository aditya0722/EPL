import { Platform } from 'react-native';
import apiClient, { API_BASE_URL, getInMemoryAccessToken } from './client';

// TYPES

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  fullName: string | null;
  mobileNumber: string | null;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | null;
  panNumber: string | null;
  aadhaarNumber: string | null;
  address: string | null;
  state: string | null;
  district: string | null;
  pincode: string | null;
  occupation: string | null;
  monthlyIncome: string | null;
  bankAccountNo: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  upiId: string | null;
  emergencyContact: string | null;
  profilePhotoUrl: string | null;
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
  emailVerified: boolean;
  profileCompletionPercentage: number;
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  loanAmount: string;
  loanPurpose: string;
  employmentType: string;
  monthlyIncome: string;
  existingEmi: string;
  loanDuration: number;
  status: 'pending' | 'under_review' | 'documents_required' | 'approved' | 'disbursed' | 'closed' | 'rejected' | 'defaulted';
  repaymentType: 'emi' | 'full_payment';
  interestRate: string;
  interestAmount: string;
  totalPayable: string;
  adminRemarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Repayment {
  id: string;
  loanId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: 'upi' | 'bank_transfer' | 'cash' | 'other';
  transactionRef: string;
  status: 'pending' | 'completed' | 'failed';
  remarks: string | null;
  screenshotUrl: string | null;
  createdAt: string;
}

export interface RepaymentMeta {
  totalRepaid: number;
  outstandingAmount: number;
  loanAmount: number;
}

export interface UserDocument {
  id: string;
  userId: string;
  documentType: 'aadhaar_front' | 'aadhaar_back' | 'pan_card' | 'selfie' | 'salary_slip' | 'bank_statement' | 'other';
  cloudinaryUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  adminRemarks: string | null;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'loan_approved' | 'loan_rejected' | 'document_required' | 'payment_recorded' | 'kyc_verified' | 'admin_message' | 'support_reply';
  read: boolean;
  createdAt: string;
}

export interface DashboardData {
  profileCompletion: number;
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
  currentLoan: Loan | null;
  loanHistory: Loan[];
  repaymentHistory: Repayment[];
  repaymentMeta: RepaymentMeta | null;
  pendingDocuments: string[];
  notifications: SystemNotification[];
}

// API SERVICES

export const AuthService = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data; // { success: true, data: { accessToken, refreshToken, user } }
  },

  register: async (data: { email: string; password: string; fullName: string; mobileNumber: string }) => {
    const res = await apiClient.post('/auth/register', { ...data, role: 'user' });
    return res.data;
  },

  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const res = await apiClient.post('/auth/change-password', data);
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (data: { email: string; token: string; newPassword: string }) => {
    const res = await apiClient.post('/auth/reset-password', data);
    return res.data;
  },
};

export const UserService = {
  getProfile: async (): Promise<{ success: boolean; data: UserProfile }> => {
    const res = await apiClient.get('/users/profile');
    return res.data;
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<{ success: boolean; data: UserProfile }> => {
    const res = await apiClient.put('/users/profile', data);
    return res.data;
  },

  getDashboard: async (): Promise<{ success: boolean; data: DashboardData }> => {
    const res = await apiClient.get('/users/dashboard');
    return res.data;
  },

  updatePushToken: async (pushToken: string): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.post('/users/push-token', { pushToken });
    return res.data;
  },
};

export const RepaymentService = {
  makeRepayment: async (data: {
    loanId: string;
    amount: number;
    paymentMethod: 'upi' | 'bank_transfer' | 'cash' | 'other';
    transactionRef: string;
    screenshotUrl: string;
    remarks?: string;
  }): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.post('/repayments', data);
    return res.data;
  },
};

export const DocumentService = {
  uploadDocument: async (fileUri: string, documentType: string, fileName?: string, fileType?: string): Promise<{ success: boolean; data: UserDocument }> => {
    const formData = new FormData();

    let mimeType = fileType;
    if (!mimeType || mimeType === 'unknown' || !mimeType.includes('/')) {
      if (fileUri.endsWith('.png')) mimeType = 'image/png';
      else if (fileUri.endsWith('.webp')) mimeType = 'image/webp';
      else mimeType = 'image/jpeg';
    }

    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const name = fileName && fileName !== 'unknown' ? fileName : `${documentType}_${Date.now()}.${ext}`;

    if (Platform.OS === 'web') {
      try {
        const fetchRes = await fetch(fileUri);
        const blob = await fetchRes.blob();
        const fileObj = new File([blob], name, { type: mimeType });
        (fileObj as any).uri = fileUri;
        formData.append('file', fileObj);
      } catch {
        formData.append('file', {
          uri: fileUri,
          name,
          type: mimeType,
        } as any);
      }
    } else {
      // React Native Mobile (iOS/Android)
      formData.append('file', {
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        name,
        type: mimeType,
      } as any);
    }

    formData.append('documentType', documentType);

    const res = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
  },

  uploadQrCode: async (fileUri: string, fileName?: string, fileType?: string): Promise<{ success: boolean; data: UserDocument }> => {
    return DocumentService.uploadDocument(fileUri, 'other', fileName, fileType);
  },

  getUserDocuments: async (): Promise<{ success: boolean; data: UserDocument[] }> => {
    const res = await apiClient.get('/documents');
    return res.data;
  },
};

export const LoanService = {
  apply: async (data: {
    loanAmount: number;
    loanPurpose: string;
    employmentType: string;
    monthlyIncome: number;
    loanDuration: number;
    existingEmi?: number;
    repaymentType: 'emi' | 'full_payment';
  }): Promise<{ success: boolean; data: Loan }> => {
    const res = await apiClient.post('/loans/apply', data);
    return res.data;
  },

  getHistory: async (): Promise<{ success: boolean; data: Loan[] }> => {
    const res = await apiClient.get('/loans/history');
    return res.data;
  },

  getDetails: async (id: string): Promise<{ success: boolean; data: { loan: Loan; repayments: Repayment[]; repaymentMeta: RepaymentMeta } }> => {
    const res = await apiClient.get(`/loans/${id}`);
    return res.data;
  },
};

export const AdminService = {
  getDashboardStats: async (): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.get('/admin/dashboard/stats');
    return res.data;
  },

  getLoans: async (params?: { search?: string; status?: string }): Promise<{ success: boolean; data: { loan: Loan; user: any }[]; meta: any }> => {
    const res = await apiClient.get('/admin/loans', { params });
    return res.data;
  },

  updateLoanStatus: async (id: string, status: string, remarks?: string): Promise<{ success: boolean; data: Loan }> => {
    const res = await apiClient.patch(`/admin/loans/${id}/status`, { status, remarks });
    return res.data;
  },

  recordRepayment: async (data: {
    loanId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    transactionRef: string;
    remarks?: string;
    screenshotUrl?: string;
  }): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.post('/admin/payments', data);
    return res.data;
  },

  getPendingRepayments: async (): Promise<{ success: boolean; data: { repayment: Repayment; loan: Loan; user: any }[] }> => {
    const res = await apiClient.get('/admin/payments/pending');
    return res.data;
  },
  
  getRepayments: async (): Promise<{ success: boolean; data: { repayment: Repayment; loan: Loan; user: any }[] }> => {
    const res = await apiClient.get('/admin/payments');
    return res.data;
  },

  verifyRepayment: async (id: string, status: 'completed' | 'failed', remarks?: string): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.patch(`/admin/payments/${id}/verify`, { status, remarks });
    return res.data;
  },

  getUsers: async (params?: { kycStatus?: string }): Promise<{ success: boolean; data: UserProfile[] }> => {
    const res = await apiClient.get('/admin/users', { params });
    return res.data;
  },

  getUserDocuments: async (userId: string): Promise<{ success: boolean; data: UserDocument[] }> => {
    const res = await apiClient.get(`/admin/users/${userId}/documents`);
    return res.data;
  },

  verifyDocument: async (docId: string, status: 'approved' | 'rejected', remarks?: string): Promise<{ success: boolean; data: UserDocument }> => {
    const res = await apiClient.patch(`/admin/documents/${docId}/verify`, { status, remarks });
    return res.data;
  },

  verifyUserKyc: async (userId: string, status: 'verified' | 'rejected'): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.patch(`/admin/users/${userId}/kyc`, { status });
    return res.data;
  },
};
