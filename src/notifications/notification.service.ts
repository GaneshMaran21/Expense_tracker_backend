import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Create a new notification
   */
  async create(
    user_id: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
  ): Promise<Notification> {
    const notification = new this.notificationModel({
      user_id,
      type,
      title,
      message,
      data,
      is_read: false,
      is_pushed: false,
    });

    return await notification.save();
  }

  /**
   * Get all notifications for a user (with optional filters)
   */
  async findAll(
    user_id: string,
    options?: {
      is_read?: boolean;
      type?: NotificationType;
      limit?: number;
      skip?: number;
    },
  ): Promise<Notification[]> {
    const query: any = { user_id };

    if (options?.is_read !== undefined) {
      query.is_read = options.is_read;
    }

    if (options?.type) {
      query.type = options.type;
    }

    const notifications = this.notificationModel
      .find(query)
      .sort({ createdAt: -1 }); // Most recent first

    if (options?.limit) {
      notifications.limit(options.limit);
    }

    if (options?.skip) {
      notifications.skip(options.skip);
    }

    return await notifications.exec();
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(user_id: string): Promise<number> {
    return await this.notificationModel.countDocuments({
      user_id,
      is_read: false,
    });
  }

  /**
   * Get a single notification by ID
   */
  async findOne(id: string, user_id: string): Promise<Notification> {
    const notification = await this.notificationModel.findOne({
      _id: id,
      user_id,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, user_id: string): Promise<Notification> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, user_id },
      { is_read: true },
      { new: true },
    );

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(user_id: string): Promise<void> {
    await this.notificationModel.updateMany(
      { user_id, is_read: false },
      { is_read: true },
    );
  }

  /**
   * Mark notification as pushed (after sending push notification)
   */
  async markAsPushed(id: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, { is_pushed: true });
  }

  /**
   * Delete a notification
   */
  async remove(id: string, user_id: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: id,
      user_id,
    });

    if (result.deletedCount === 0) {
      throw new Error('Notification not found');
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(user_id: string): Promise<void> {
    await this.notificationModel.deleteMany({
      user_id,
      is_read: true,
    });
  }

  /**
   * Check if a notification of a specific type for a specific budget exists today
   * Used to prevent duplicate budget alert notifications
   */
  async hasNotificationToday(
    user_id: string,
    type: NotificationType,
    budget_id: string,
    todayStart: Date,
    todayEnd: Date,
  ): Promise<boolean> {
    const count = await this.notificationModel.countDocuments({
      user_id,
      type,
      'data.budget_id': budget_id,
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    return count > 0;
  }
}

