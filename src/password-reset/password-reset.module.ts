import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SignUpSchema, signUpSchemaFact } from 'src/signup/signup.schema';
import {
  RefreshTokenSchema,
  refreshTokenSchema,
} from 'src/auth/auth.schema';
import {
  PasswordResetToken,
  PasswordResetSchema,
} from './password-reset.schema';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetService } from './password-reset.service';
import { MailService } from './mail.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SignUpSchema.name, schema: signUpSchemaFact },
      { name: PasswordResetToken.name, schema: PasswordResetSchema },
      { name: RefreshTokenSchema.name, schema: refreshTokenSchema },
    ]),
  ],
  controllers: [PasswordResetController],
  providers: [PasswordResetService, MailService],
})
export class PasswordResetModule {}
