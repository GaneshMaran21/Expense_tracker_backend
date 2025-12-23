import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ExpenseDocument = Expense & Document;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ type: String, required: true, index: true })
  user_id: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  category_id: string;

  @Prop({ type: String })
  category_name: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  date: Date;

  @Prop({ type: String })
  description: string;

  @Prop({ 
    type: String, 
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'],
    default: 'cash'
  })
  payment_method: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String })
  receipt_image_url: string;

  @Prop({ type: Boolean, default: false })
  is_recurring: boolean;

  @Prop({ type: String })
  recurring_id: string;

  @Prop({ type: Boolean, default: true })
  is_synced: boolean;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

// Transform to JSON to ensure dates are serialized as IST strings
// MongoDB stores dates in UTC. We convert them to IST when serializing.
ExpenseSchema.set('toJSON', {
  transform: function(doc: any, ret: any) {
    // Helper function: Convert UTC date to IST ISO string with +05:30 timezone
    const toISTString = (dateValue: Date | string): string => {
      if (!dateValue) return '';
      
      // Parse the date (MongoDB stores in UTC)
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      
      if (isNaN(date.getTime())) {
        return typeof dateValue === 'string' ? dateValue : '';
      }
      
      // Add 5:30 hours (330 minutes) to convert UTC to IST
      const istDate = new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000);
      
      // Format as ISO string with +05:30 timezone offset
      // Format: YYYY-MM-DDTHH:mm:ss.sss+05:30
      const year = istDate.getUTCFullYear();
      const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      const hours = String(istDate.getUTCHours()).padStart(2, '0');
      const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
      const milliseconds = String(istDate.getUTCMilliseconds()).padStart(3, '0');
      
      const istString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+05:30`;
      
      return istString;
    };
    
    // Handle date field - convert UTC to IST
    if (ret.date) {
      try {
        ret.date = toISTString(ret.date);
      } catch (e) {
        // Silently handle conversion errors
      }
    }
    
    // Handle createdAt - always convert UTC to IST
    if (ret.createdAt) {
      try {
        ret.createdAt = toISTString(ret.createdAt);
      } catch (e) {
        // Silently handle conversion errors
      }
    }
    
    // Handle updatedAt - always convert UTC to IST
    if (ret.updatedAt) {
      try {
        ret.updatedAt = toISTString(ret.updatedAt);
      } catch (e) {
        // Silently handle conversion errors
      }
    }
    
    return ret;
  },
  virtuals: true
});

