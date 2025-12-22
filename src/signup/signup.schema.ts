import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { istDatePlugin } from "../utils/istDate.plugin";

export type signUpSchemaDocument = SignUpSchema & Document

@Schema({ timestamps: true })
export class SignUpSchema {
  @Prop({ type: String, unique: true })
  user_name: string;

  @Prop({ type: String, unique: true })
  email: string;

  @Prop({ type: String })
  password: string;

  @Prop({ type: String })
  date_of_birth: string;
}

export const signUpSchemaFact = SchemaFactory.createForClass(SignUpSchema);
// Apply IST date plugin for timestamps (createdAt, updatedAt)
signUpSchemaFact.plugin(istDatePlugin); 