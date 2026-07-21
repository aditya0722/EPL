import { DocumentRepository } from "../repositories/document.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { AuditRepository } from "../repositories/audit.repository.js";
import { NotificationService } from "./notification.service.js";
import { AppError } from "../utils/app-error.js";
import { uploadToCloud } from "../utils/cloudinary.js";
import { documents } from "../db/schema/documents.js";

export class DocumentService {
  private docRepo: DocumentRepository;
  private userRepo: UserRepository;
  private auditRepo: AuditRepository;
  private notificationService: NotificationService;

  constructor() {
    this.docRepo = new DocumentRepository();
    this.userRepo = new UserRepository();
    this.auditRepo = new AuditRepository();
    this.notificationService = new NotificationService();
  }

  async uploadDocument(userId: string, localFilePath: string, type: typeof documents.$inferSelect.documentType) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const cloudinaryUrl = await uploadToCloud(localFilePath, `users/${userId}/docs`);

    const existingDoc = await this.docRepo.findByUserIdAndType(userId, type);

    let doc;
    if (existingDoc) {
      doc = await this.docRepo.update(existingDoc.id, {
        cloudinaryUrl,
        status: "pending",
        adminRemarks: null,
      });
    } else {
      doc = await this.docRepo.create({
        userId,
        documentType: type,
        cloudinaryUrl,
        status: "pending",
      });
    }

    await this.auditRepo.create({
      userId,
      action: "document_upload",
      details: { documentId: doc.id, type },
    });

    const userDocs = await this.docRepo.findByUserId(userId);
    const mandatoryTypes: typeof type[] = ["aadhaar_front", "aadhaar_back", "pan_card", "selfie"];
    const uploadedMandatory = mandatoryTypes.every((mt) =>
      userDocs.some((d) => d.documentType === mt)
    );

    if (uploadedMandatory && (user.kycStatus === "pending" || user.kycStatus === "rejected")) {
      await this.userRepo.update(userId, { kycStatus: "submitted" });
      await this.notificationService.notifyAdmins(
        "KYC Submission Received 🛡️",
        `${user.fullName || user.email} submitted all mandatory KYC documents for review.`,
        "document_required",
        { userId }
      );
    }

    return doc;
  }

  async getUserDocuments(userId: string) {
    return this.docRepo.findByUserId(userId);
  }

  async verifyDocumentByAdmin(adminId: string, docId: string, status: "approved" | "rejected", remarks?: string) {
    const doc = await this.docRepo.findById(docId);
    if (!doc) {
      throw new AppError("Document not found", 404);
    }

    const updatedDoc = await this.docRepo.update(docId, {
      status,
      adminRemarks: remarks || null,
    });

    await this.auditRepo.create({
      userId: adminId,
      action: "document_verification",
      details: { docId, type: doc.documentType, status, remarks },
    });

    const title = status === "approved" ? "Document Approved ✅" : "Document Rejected ❌";
    const msg = status === "approved" 
      ? `Your ${doc.documentType.replace("_", " ")} has been approved by admin.` 
      : `Your ${doc.documentType.replace("_", " ")} was rejected. Remarks: ${remarks || "Please re-upload."}`;
    
    await this.notificationService.notify(doc.userId, title, msg, status === "approved" ? "kyc_verified" : "document_required");

    const userDocs = await this.docRepo.findByUserId(doc.userId);
    const mandatoryTypes = ["aadhaar_front", "aadhaar_back", "pan_card", "selfie"];
    
    const allApproved = mandatoryTypes.every((mt) =>
      userDocs.some((d) => d.documentType === mt && d.status === "approved")
    );

    const anyRejected = mandatoryTypes.some((mt) =>
      userDocs.some((d) => d.documentType === mt && d.status === "rejected")
    );

    const user = await this.userRepo.findById(doc.userId);
    if (user) {
      if (allApproved) {
        await this.userRepo.update(doc.userId, { kycStatus: "verified" });
        await this.notificationService.notify(
          doc.userId,
          "KYC Verification Successful 🌟",
          "Your KYC verification is complete. You can now apply for loans.",
          "kyc_verified"
        );
      } else if (anyRejected) {
        await this.userRepo.update(doc.userId, { kycStatus: "rejected" });
      }
    }

    return updatedDoc;
  }
}
