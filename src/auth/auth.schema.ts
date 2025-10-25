import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

export type refreshTokenDocument = Document & RefreshTokenSchema
@Schema()
export class RefreshTokenSchema{
     @Prop({type:mongoose.Types.ObjectId,required:true,})
    user:mongoose.Types.ObjectId

    @Prop({required:true})
    token:string

    @Prop({required:true})
    expiryDate:Date
}

export const refreshTokenSchema = SchemaFactory.createForClass(RefreshTokenSchema)