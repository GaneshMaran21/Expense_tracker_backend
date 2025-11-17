import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RefreshTokenSchema, refreshTokenSchema } from "./auth.schema";
import { JwtModule } from "@nestjs/jwt";
import { SignInService } from "src/signin/signin.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthGuard } from "./auth.gurad";
import { SignUpModule } from "src/signup/signup.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RefreshTokenSchema.name, schema: refreshTokenSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "1h" },
      }),
      inject: [ConfigService],
    }),
    SignUpModule,
  ],
  providers: [AuthGuard, SignInService],
  exports: [AuthGuard, JwtModule, SignInService], // ✅ export SignInService
})
export class AuthModule {}