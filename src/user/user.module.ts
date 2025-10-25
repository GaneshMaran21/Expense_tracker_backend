import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { AuthModule } from "src/auth/auth.module";
import { MongooseModule } from "@nestjs/mongoose";
import { RefreshTokenSchema, refreshTokenSchema } from "src/auth/auth.schema";
import { SignUpSchema, signUpSchemaFact } from "src/signup/signup.schema";
import { UserService } from "./user.service";

@Module({
    imports:[MongooseModule.forFeature([{  name:RefreshTokenSchema.name,schema:refreshTokenSchema},{name:SignUpSchema.name,schema:signUpSchemaFact}]),AuthModule],
    controllers:[UserController],
    providers:[UserService]
})

export class UserModule{}