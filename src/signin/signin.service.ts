import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { refreshTokenDocument, RefreshTokenSchema } from "src/auth/auth.schema";
import { SignInDto } from "src/dto/signin.dto";
import { SignUpSchema, signUpSchemaDocument } from "src/signup/signup.schema";
import {v4 as uuidv4} from 'uuid'


@Injectable()
export class SignInService{
    constructor(@InjectModel(SignUpSchema.name) private  userSchemaDocument : Model<signUpSchemaDocument>,
    private readonly jwtService : JwtService,
    @InjectModel(RefreshTokenSchema.name) private refreshModel : Model<refreshTokenDocument>
    
) {}

   async siginUser(data:SignInDto){
        const isUserExisted = await this.userSchemaDocument.findOne({$and:[{$or:[{user_name:data?.user_name},{email:data?.user_name}]},{password:data?.password}]})
        const isUsernameExisted = await this.userSchemaDocument.findOne({$or:[{user_name:data?.user_name},{email:data?.user_name}]})
        if(isUsernameExisted && !isUserExisted){
            throw new UnauthorizedException('Password is incorrect')
        }
        else if(isUserExisted){
          const tokens = await this.generateUserTokens(isUserExisted?._id)
          return {...tokens,user_name:isUserExisted?.user_name}
        }
        else{
            throw  new NotFoundException('user name and password is incorrect')
        }


   }



    async generateUserTokens(userId:any){
    const accessToken = this.jwtService.sign({userId},{expiresIn:'15m'})
    const refreshToken = uuidv4()
    await this.storeRefreshToken(refreshToken,userId)
    return {accessToken,refreshToken}
  }

  async storeRefreshToken(token:string,userId){
    let expiryDate=new Date();
    expiryDate.setDate(expiryDate.getDate() + 3)
    const refreshDoc = new this.refreshModel({
    user: userId,
    token,
    expiryDate,
  });
  return refreshDoc.save();
  }
// checking the refresh token that updates the db and it should update the refresh token in the expiry date is expired.
  async refreshTokens (refreshToken :string){
    const token = await this.refreshModel.findOneAndDelete({token:refreshToken,expiryDate:{$gte:new Date ()}})
    if(token){
      return this.generateUserTokens(token?.id)
    }
    else return new UnauthorizedException("Token Expired Please Login Again")
  }
  

}