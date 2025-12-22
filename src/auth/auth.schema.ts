import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
import { istDatePlugin, getCurrentIST } from "../utils/istDate.plugin";

export type refreshTokenDocument = Document & RefreshTokenSchema

@Schema()
export class RefreshTokenSchema {
  @Prop({ type: mongoose.Types.ObjectId, required: true })
  user: mongoose.Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true, default: () => getCurrentIST() })
  expiryDate: Date;
}

export const refreshTokenSchema = SchemaFactory.createForClass(RefreshTokenSchema);
// Apply IST date plugin
refreshTokenSchema.plugin(istDatePlugin);