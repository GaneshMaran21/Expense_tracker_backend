import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { SignUpSchema, signUpSchemaDocument } from 'src/signup/signup.schema';
import {
  RefreshTokenSchema,
  refreshTokenDocument,
} from 'src/auth/auth.schema';
import { ForgotPasswordDto } from 'src/dto/forgot-password.dto';
import { ResetPasswordDto } from 'src/dto/reset-password.dto';
import {
  PasswordResetToken,
  PasswordResetDocument,
} from './password-reset.schema';
import { MailService } from './mail.service';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MINUTES = 15;

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectModel(SignUpSchema.name)
    private readonly userModel: Model<signUpSchemaDocument>,
    @InjectModel(PasswordResetToken.name)
    private readonly resetModel: Model<PasswordResetDocument>,
    @InjectModel(RefreshTokenSchema.name)
    private readonly refreshModel: Model<refreshTokenDocument>,
    private readonly mailService: MailService,
  ) {}

  private async findUserByIdentifier(identifier: string) {
    const trimmed = identifier.trim();
    return this.userModel.findOne({
      $or: [{ user_name: trimmed }, { email: trimmed.toLowerCase() }],
    });
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  async requestPasswordReset(dto: ForgotPasswordDto) {
    const user = await this.findUserByIdentifier(dto.identifier);

    if (!user) {
      return {
        message:
          'If an account exists with that username or email, we sent a reset code.',
      };
    }

    const windowStart = new Date(
      Date.now() - REQUEST_WINDOW_MINUTES * 60 * 1000,
    );
    const recentRequests = await this.resetModel.countDocuments({
      userId: user._id,
      createdAt: { $gte: windowStart },
    });

    if (recentRequests >= MAX_REQUESTS_PER_WINDOW) {
      throw new HttpException(
        `Too many reset requests. Please wait ${REQUEST_WINDOW_MINUTES} minutes and try again.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.resetModel.updateMany(
      { userId: user._id, used: false },
      { $set: { used: true } },
    );

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.resetModel.create({
      userId: user._id,
      otpHash,
      expiresAt,
      attempts: 0,
      used: false,
    });

    try {
      await this.mailService.sendPasswordResetOtp(
        user.email,
        user.user_name,
        otp,
      );
    } catch {
      throw new BadRequestException(
        'We could not send the reset email right now. Please try again in a few minutes.',
      );
    }

    return {
      message:
        'If an account exists with that username or email, we sent a reset code.',
      maskedEmail: this.maskEmail(user.email),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findUserByIdentifier(dto.identifier);

    if (!user) {
      throw new NotFoundException(
        'No account found. Please check your username or email and try again.',
      );
    }

    const resetRecord = await this.resetModel
      .findOne({
        userId: user._id,
        used: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 });

    if (!resetRecord) {
      throw new BadRequestException(
        'Your reset code has expired or is invalid. Please request a new code.',
      );
    }

    if (resetRecord.attempts >= MAX_OTP_ATTEMPTS) {
      resetRecord.used = true;
      await resetRecord.save();
      throw new BadRequestException(
        'Too many incorrect attempts. Please request a new reset code.',
      );
    }

    const otpValid = await bcrypt.compare(dto.otp, resetRecord.otpHash);

    if (!otpValid) {
      resetRecord.attempts += 1;
      await resetRecord.save();
      const remaining = MAX_OTP_ATTEMPTS - resetRecord.attempts;
      throw new BadRequestException(
        remaining > 0
          ? `Incorrect code. You have ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Please request a new reset code.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    resetRecord.used = true;
    await resetRecord.save();

    await this.refreshModel.deleteMany({ user: user._id });

    return {
      message: 'Password updated successfully. You can now sign in with your new password.',
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';
    const visible =
      local.length <= 2
        ? local[0] + '*'
        : local[0] + '***' + local[local.length - 1];
    return `${visible}@${domain}`;
  }
}
