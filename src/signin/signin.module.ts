import { Module } from "@nestjs/common";
import { SignInController } from "./sigin.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { SignUpSchema, signUpSchemaFact } from "src/signup/signup.schema";
import { SignInService } from "./signin.service";
import { refreshTokenSchema, RefreshTokenSchema } from "src/auth/auth.schema";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
    imports:[MongooseModule.forFeature([
      { name: SignUpSchema.name, schema: signUpSchemaFact },{
        name:RefreshTokenSchema.name,schema:refreshTokenSchema
      } // ✅ must include schema
    ]), 
     JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
],
    providers:[SignInService],
    controllers:[SignInController]

})
export class SignInModule{}