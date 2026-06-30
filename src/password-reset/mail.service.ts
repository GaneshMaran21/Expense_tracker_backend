import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('Resend_API_KEY') ||
      this.configService.get<string>('RESEND_API_KEY');

    this.resend = new Resend(apiKey);
    this.fromAddress =
      this.configService.get<string>('MAIL_FROM') ||
      'EX-Tracker <onboarding@resend.dev>';
  }

  buildResetPasswordHtml(userName: string, otp: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#EEF2FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEF2FF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(29,65,249,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#1d41f9,#2044f9);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">EX-Tracker</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Password Reset</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 8px;color:#0e1b26;font-size:16px;font-weight:600;">Hi ${userName},</p>
              <p style="margin:0 0 24px;color:#0e1b26;font-size:15px;line-height:1.6;opacity:0.8;">
                We received a request to reset your password. Enter the code below in the EX-Tracker app to continue.
              </p>
              <div style="background:#FAF8F3;border:2px dashed #1d41f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#0e1b26;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.6;">Your reset code</p>
                <p style="margin:0;color:#1d41f9;font-size:36px;font-weight:800;letter-spacing:12px;font-family:monospace;">${otp}</p>
              </div>
              <p style="margin:0 0 8px;color:#0e1b26;font-size:13px;opacity:0.7;">
                This code expires in <strong>10 minutes</strong>.
              </p>
              <p style="margin:0;color:#0e1b26;font-size:13px;opacity:0.7;">
                If you did not request a password reset, you can safely ignore this email. Your password will not change.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#FAF8F3;padding:20px 24px;text-align:center;border-top:1px solid rgba(14,27,38,0.08);">
              <p style="margin:0;color:#0e1b26;font-size:12px;opacity:0.5;">&copy; ${new Date().getFullYear()} EX-Tracker &middot; Automated message, do not reply</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendPasswordResetOtp(
    to: string,
    userName: string,
    otp: string,
  ): Promise<void> {
    const html = this.buildResetPasswordHtml(userName, otp);
    const text = `Hi ${userName}, your EX-Tracker password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`;

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: 'Your EX-Tracker password reset code',
      html,
      text,
    });

    if (error) {
      this.logger.error('Resend email failed', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  }
}
