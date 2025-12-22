import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { refreshTokenDocument, RefreshTokenSchema } from "src/auth/auth.schema";
import { SignInDto } from "src/dto/signin.dto";
import { SignUpSchema, signUpSchemaDocument } from "src/signup/signup.schema";
import {v4 as uuidv4} from 'uuid';
import * as bcrypt from 'bcrypt';
import { getCurrentIST, toUTC } from "../utils/istDate.plugin";


@Injectable()
export class SignInService{
    constructor(@InjectModel(SignUpSchema.name) private  userSchemaDocument : Model<signUpSchemaDocument>,
    private readonly jwtService : JwtService,
    @InjectModel(RefreshTokenSchema.name) private refreshModel : Model<refreshTokenDocument>
    
) {}

   async siginUser(data:SignInDto){
        const isUsernameExisted = await this.userSchemaDocument.findOne({
            $or:[{user_name:data?.user_name},{email:data?.user_name}]
        })
        
        if(!isUsernameExisted){
            throw new NotFoundException('user name and password is incorrect')
        }
        
        // Compare hashed password
        const isPasswordValid = await bcrypt.compare(data.password, isUsernameExisted.password);
        
        if(!isPasswordValid){
            throw new UnauthorizedException('Password is incorrect')
        }
        
        // Password is valid, generate tokens
        const tokens = await this.generateUserTokens(isUsernameExisted?._id)
        return {...tokens, user_name:isUsernameExisted?.user_name}
   }



    async generateUserTokens(userId:any){
    const accessToken = this.jwtService.sign({userId},{expiresIn:'1h'})
    const refreshToken = uuidv4()
    await this.storeRefreshToken(refreshToken,userId)
    return {accessToken,refreshToken}
  }

  async storeRefreshToken(token: string, userId: any) {
    // Calculate expiry date 7 days from now in IST
    const istNow = getCurrentIST();
    const expiryDate = new Date(istNow);
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    // Convert to UTC for storage (plugin will handle conversion)
    const expiryDateUTC = toUTC(expiryDate);
    
    const refreshDoc = new this.refreshModel({
      user: userId,
      token,
      expiryDate: expiryDateUTC,
    });
    return refreshDoc.save();
  }
// checking the refresh token that updates the db and it should update the refresh token in the expiry date is expired.
  async refreshTokens (refreshToken :string){
    const token = await this.refreshModel.findOneAndDelete({token:refreshToken,expiryDate:{$gte:new Date ()}})
    if(token){
      return this.generateUserTokens(token?.user)
    }
    else return new UnauthorizedException("Token Expired Please Login Again")
  }
  

}