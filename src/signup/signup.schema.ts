import {  Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { single } from "rxjs";
export type signUpSchemaDocument = SignUpSchema & Document
@Schema({timestamps:true})
export class SignUpSchema{
    @Prop({type:String,unique:true})
    user_name:string

    @Prop({type:String,unique:true})
    email:string
ß
    @Prop({type:String})
    password:string

    @Prop({type:String})
    date_of_birth:string
}

export const signUpSchemaFact = SchemaFactory.createForClass(SignUpSchema) 