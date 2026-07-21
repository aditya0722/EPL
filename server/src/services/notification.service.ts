import { NotificationRepository } from "../repositories/notification.repository.js";
import { UserRepository } from "../repositories/user.repository.js";

export class NotificationService {
  private notificationRepo: NotificationRepository;
  private userRepo: UserRepository;

  constructor() {
    this.notificationRepo = new NotificationRepository();
    this.userRepo = new UserRepository();
  }

  // Send Push Notification via Expo Push Service HTTP API
  private async sendExpoPushNotification(pushToken: string, title: string, body: string, data?: any) {
    if (!pushToken || typeof pushToken !== "string") {
      return;
    }
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          to: pushToken,
          sound: "default",
          title,
          body,
          data: data || {},
        }),
      });
    } catch {
      // Ignore network errors in async push delivery
    }
  }

  async notify(
    userId: string,
    title: string,
    message: string,
    type: "loan_approved" | "loan_rejected" | "document_required" | "payment_recorded" | "kyc_verified" | "admin_message" | "support_reply"
  ) {
    const notification = await this.notificationRepo.create({
      userId,
      title,
      message,
      type,
    });

    // Send push notification to user device if push token exists
    const user = await this.userRepo.findById(userId);
    if (user && user.pushToken) {
      await this.sendExpoPushNotification(user.pushToken, title, message, { notificationId: notification.id, type });
    }

    return notification;
  }

  // Notify all active Admin accounts via Push Notification and DB Notification
  async notifyAdmins(
    title: string,
    message: string,
    type: "admin_message" | "document_required" | "payment_recorded" = "admin_message",
    data?: any
  ) {
    const admins = await this.userRepo.findAdmins();
    for (const admin of admins) {
      await this.notificationRepo.create({
        userId: admin.id,
        title,
        message,
        type,
      });

      if (admin.pushToken) {
        await this.sendExpoPushNotification(admin.pushToken, title, message, { ...data, type });
      }
    }
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
