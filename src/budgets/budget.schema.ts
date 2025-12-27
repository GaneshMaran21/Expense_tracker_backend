import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type BudgetDocument = Budget & Document;

@Schema({ timestamps: true })
export class Budget {
  @Prop({ type: String, required: true, index: true })
  user_id: string;

  @Prop({ type: String, required: true })
  name: string; // e.g., "Monthly Groceries", "Entertainment Budget"

  @Prop({ type: String, default: null })
  category_id: string | null; // null for overall budget, category_id for category-specific budget

  @Prop({ type: Number, required: true })
  amount: number; // Budget limit amount

  @Prop({
    type: String,
    enum: ['weekly', 'monthly', 'yearly', 'custom'],
    default: 'monthly'
  })
  period: string; // Budget period type

  @Prop({ type: Date, required: true })
  start_date: Date; // Start date of budget period

  @Prop({ type: Date, required: true })
  end_date: Date; // End date of budget period

  @Prop({ type: Number, default: 80, min: 0, max: 100 })
  alert_threshold: number; // Percentage at which to alert (e.g., 80 = alert at 80% of budget)

  @Prop({ type: Boolean, default: true })
  is_active: boolean; // Whether budget is active or archived

  @Prop({ type: Date })
  last_alert_date: Date | null; // Track when last alert was sent to avoid spamming
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);

// Add index for efficient queries
BudgetSchema.index({ user_id: 1, is_active: 1 });
BudgetSchema.index({ user_id: 1, category_id: 1, is_active: 1 });

// Transform to JSON to ensure dates are serialized as IST strings
BudgetSchema.set('toJSON', {
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
    
    // Handle date fields
    if (ret.start_date) {
      try {
        ret.start_date = toISTString(ret.start_date);
      } catch (e) {}
    }
    
    if (ret.end_date) {
      try {
        ret.end_date = toISTString(ret.end_date);
      } catch (e) {}
    }

    if (ret.last_alert_date) {
      try {
        ret.last_alert_date = toISTString(ret.last_alert_date);
      } catch (e) {}
    }
    
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

