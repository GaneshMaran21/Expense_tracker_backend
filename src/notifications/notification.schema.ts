import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  BUDGET_ALERT = 'budget_alert', // Budget exceeded
  BUDGET_THRESHOLD = 'budget_threshold', // Budget reached threshold (e.g., 80%)
  BILL_REMINDER = 'bill_reminder', // Recurring bill reminder
  SPENDING_SUMMARY = 'spending_summary', // Daily/weekly spending summary
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: String, required: true, index: true })
  user_id: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true
  })
  type: NotificationType;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>; // Additional data (e.g., budget_id, expense_id, etc.)

  @Prop({ type: Boolean, default: false, index: true })
  is_read: boolean;

  @Prop({ type: Boolean, default: false })
  is_pushed: boolean; // Whether push notification was sent

  // Timestamps are automatically added by Mongoose when timestamps: true
  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Add indexes for efficient queries
NotificationSchema.index({ user_id: 1, is_read: 1 });
NotificationSchema.index({ user_id: 1, type: 1 });
NotificationSchema.index({ user_id: 1, createdAt: -1 }); // For sorting by date

// Transform to JSON to ensure dates are serialized as IST strings
NotificationSchema.set('toJSON', {
  transform: function(doc: any, ret: any) {
    // Helper function: Convert UTC date to IST ISO string with +05:30 timezone
    const toISTString = (dateValue: Date | string): string => {
      if (!dateValue) return '';
      
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      
      if (isNaN(date.getTime())) {
        return typeof dateValue === 'string' ? dateValue : '';
      }
      
      // Add 5:30 hours (330 minutes) to convert UTC to IST
      const istDate = new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000);
      
      const year = istDate.getUTCFullYear();
      const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      const hours = String(istDate.getUTCHours()).padStart(2, '0');
      const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
      const milliseconds = String(istDate.getUTCMilliseconds()).padStart(3, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+05:30`;
    };
    
    // Handle timestamps
    if (ret.createdAt) {
      try {
        ret.createdAt = toISTString(ret.createdAt);
      } catch (e) {}
    }
    
    if (ret.updatedAt) {
      try {
        ret.updatedAt = toISTString(ret.updatedAt);
      } catch (e) {}
    }
    
    return ret;
  },
  virtuals: true
});

