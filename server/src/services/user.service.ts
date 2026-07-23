import { UserRepository } from "../repositories/user.repository.js";
import { AuditRepository } from "../repositories/audit.repository.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { AppError } from "../utils/app-error.js";
import { users } from "../db/schema/users.js";

export class UserService {
  private userRepo: UserRepository;
  private auditRepo: AuditRepository;
  private docRepo: DocumentRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.auditRepo = new AuditRepository();
    this.docRepo = new DocumentRepository();
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const docs = await this.docRepo.findByUserId(userId);
    const hasQrCode = docs.some((d) => d.documentType === "other");
    const hasSelfie = docs.some((d) => d.documentType === "selfie");
    const { password, refreshToken, ...userWithoutSensitive } = user;
    const completion = this.calculateCompletion(user, hasQrCode, hasSelfie);
    return {
      ...userWithoutSensitive,
      profileCompletionPercentage: completion,
    };
  }

  async updateProfile(userId: string, data: Partial<typeof users.$inferInsert>) {
    const { password, role, refreshToken, email, id, createdAt, updatedAt, deletedAt, ...allowedData } = data as any;

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const kycFieldsChanged = 
      allowedData.fullName || 
      allowedData.mobileNumber || 
      allowedData.dob || 
      allowedData.gender || 
      allowedData.panNumber || 
      allowedData.aadhaarNumber || 
      allowedData.address || 
      allowedData.state ||
      allowedData.district ||
      allowedData.pincode ||
      allowedData.occupation || 
      allowedData.monthlyIncome || 
      allowedData.bankAccountNo || 
      allowedData.bankIfsc ||
      allowedData.bankName ||
      allowedData.upiId ||
      allowedData.emergencyContact;
    
    let updatedKycStatus = user.kycStatus;
    if (kycFieldsChanged && (user.kycStatus === "pending" || user.kycStatus === "rejected")) {
      updatedKycStatus = "submitted";
    }

    const updatedUser = await this.userRepo.update(userId, {
      ...allowedData,
      kycStatus: updatedKycStatus,
    });

    await this.auditRepo.create({
      userId,
      action: "profile_change",
      details: { changedFields: Object.keys(allowedData) },
    });

    const docs = await this.docRepo.findByUserId(userId);
    const hasQrCode = docs.some((d) => d.documentType === "other");
    const hasSelfie = docs.some((d) => d.documentType === "selfie");
    const { password: _, refreshToken: __, ...userWithoutSensitive } = updatedUser;
    const completion = this.calculateCompletion(updatedUser, hasQrCode, hasSelfie);
    return {
      ...userWithoutSensitive,
      profileCompletionPercentage: completion,
    };
  }

  private calculateCompletion(user: typeof users.$inferSelect, hasQrCode: boolean, hasSelfie: boolean): number {
    const mandatoryFields: (keyof typeof users.$inferSelect)[] = [
      "fullName",
      "mobileNumber",
      "dob",
      "gender",
      "address",
      "state",
      "district",
      "pincode",
      "occupation",
      "monthlyIncome",
      "bankAccountNo",
      "bankIfsc",
      "bankName",
      "aadhaarNumber",
      "panNumber",
      "emergencyContact",
      "upiId"
    ];

    let filledCount = 0;
    mandatoryFields.forEach((field) => {
      const val = user[field];
      if (val !== null && val !== undefined && val !== "") {
        filledCount++;
      }
    });

    if (hasQrCode) {
      filledCount++;
    }

    if (hasSelfie) {
      filledCount++;
    }

    const totalFields = mandatoryFields.length + 2; // mandatory fields + QR Code image + mandatory selfie photo

    return Math.round((filledCount / totalFields) * 100);
  }
}
