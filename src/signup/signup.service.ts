import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { SignUpSchema, signUpSchemaDocument, signUpSchemaFact } from "./signup.schema";
import { Model } from "mongoose";
import { SignUpModule } from "./signup.module";
import { SignUpDto } from "src/dto/signup.dto";
import { stat } from "fs";

@Injectable()
export class SignUpService{
    constructor(@InjectModel(SignUpSchema.name) private userSchemaDocument = Model<signUpSchemaDocument>) { }
    async createUser (data:any){
        const isExistingUser = await this.userSchemaDocument.findOne({$or:[{user_name:data?.user_name},{email:data?.email}]})
        if(isExistingUser){
            throw  new BadRequestException ({
            status:400,
            error:"User Email or Email id is already exist"
            })
        }
        else {
            const create = new this.userSchemaDocument(data)
            return await create.save()
        }
    }
}