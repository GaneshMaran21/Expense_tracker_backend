import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type PasswordResetDocument = Document & PasswordResetToken;

@Schema({ timestamps: true })
export class PasswordResetToken {
  @Prop({ type: mongoose.Types.ObjectId, required: true, index: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  otpHash: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  used: boolean;
}

export const PasswordResetSchema =
  SchemaFactory.createForClass(PasswordResetToken);

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
