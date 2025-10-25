import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SignUpSchema, signUpSchemaDocument } from "src/signup/signup.schema";

@Injectable()
export class UserService{
    constructor(@InjectModel(SignUpSchema.name) private signUpUserModel : Model<signUpSchemaDocument>) {}
    async getUserDetails (userName:string){
        const findUserDetails = await this.signUpUserModel.findOne({user_name:userName})
        if(findUserDetails){
            return findUserDetails
        }
        else{
            throw new NotFoundException("User not Found")
        }
    }

}