import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { istDatePlugin, getCurrentIST } from "../utils/istDate.plugin";

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

  @Prop({ type: Date, required: true, default: () => getCurrentIST() })
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
// Apply IST date plugin
ExpenseSchema.plugin(istDatePlugin);

