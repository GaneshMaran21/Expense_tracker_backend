import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { SignUpSchema, signUpSchemaDocument } from "./signup.schema";
import { Model } from "mongoose";
import { SignUpDto } from "src/dto/signup.dto";
import * as bcrypt from 'bcrypt';

@Injectable()
export class SignUpService{
    constructor(@InjectModel(SignUpSchema.name) private userSchemaDocument: Model<signUpSchemaDocument>) { }
    
    async createUser (data:SignUpDto){
        const isExistingUser = await this.userSchemaDocument.findOne({
            $or:[{user_name:data?.user_name},{email:data?.email}]
        })
        
        if(isExistingUser){
            throw new BadRequestException({
                status:400,
                error:"Username or email id already exists"
            })
        }
        
        // Hash password before saving
        const hashedPassword = await bcrypt.hash(data.password, 10);
        
        const userData = {
            ...data,
            password: hashedPassword
        };
        
        const create = new this.userSchemaDocument(userData)
        return await create.save()
    }
}