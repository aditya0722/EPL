import { NotificationRepository } from "../repositories/notification.repository.js";

export class NotificationService {
  private notificationRepo: NotificationRepository;

  constructor() {
    this.notificationRepo = new NotificationRepository();
  }

  async notify(
    userId: string,
    title: string,
    message: string,
    type: "loan_approved" | "loan_rejected" | "document_required" | "payment_recorded" | "kyc_verified" | "admin_message" | "support_reply"
  ) {
    return this.notificationRepo.create({
      userId,
      title,
      message,
      type,
    });
  }

  async getNotifications(userId: string) {
    return this.notificationRepo.findByUserId(userId);
  }

  async markAsRead(id: string, userId: string) {
    return this.notificationRepo.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string) {
    return this.notificationRepo.markAllAsRead(userId);
  }
}
