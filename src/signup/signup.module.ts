import { Module } from "@nestjs/common";
import { SignUpController } from "./signup.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { SignUpSchema, signUpSchemaFact } from "./signup.schema";
import { SignUpService } from "./signup.service";

@Module({
    imports:[MongooseModule.forFeature([
      { name: SignUpSchema.name, schema: signUpSchemaFact } // ✅ must include schema
    ]),],
    controllers:[SignUpController],
    providers:[SignUpService],
    exports:[MongooseModule]
})
export class SignUpModule {}
