import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, Response } from 'express';
import { RefreshTokenSchema, refreshTokenDocument } from './auth.schema';
import { SignInService } from 'src/signin/signin.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly signInService: SignInService,
    @InjectModel(RefreshTokenSchema.name) private readonly refreshModel: Model<refreshTokenDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();

    // ✅ Get access token from cookies (web) or Authorization header (Swagger/mobile)
    let accessToken: string | undefined =
      req.cookies?.accessToken ||
      req.headers['authorization']?.toString().replace('Bearer ', '');

    // ✅ Get refresh token from cookies (web) or custom header (mobile)
    const refreshToken: string | undefined =
      req.cookies?.refreshToken || req.headers['x-refresh-token']?.toString();

    if (!accessToken) throw new UnauthorizedException('Access token missing');

    try {
      // Verify access token
      const payload = this.jwtService.verify(accessToken);
      req['user'] = payload; // optional: attach payload to request
      return true;
    } catch (err: any) {
      // Token expired
      if (err.name === 'TokenExpiredError') {
        if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

        // Check refresh token validity in DB
        const tokenDoc = await this.refreshModel.findOne({ token: refreshToken });
        if (!tokenDoc || tokenDoc.expiryDate < new Date()) {
          throw new UnauthorizedException('Refresh token expired, please login again');
        }

        // Issue new tokens
        const newTokens = await this.signInService.generateUserTokens(tokenDoc.user);

        // Set new cookies for web
        res.cookie('accessToken', newTokens.accessToken, { httpOnly: true, sameSite: 'strict' });
        res.cookie('refreshToken', newTokens.refreshToken, { httpOnly: true, sameSite: 'strict' });
        res.cookie('newAccessToken',true)
        // Optional: also attach to response headers for mobile/Swagger
        res.setHeader('x-access-token', newTokens.accessToken);
        res.setHeader('x-refresh-token', newTokens.refreshToken);
        res.setHeader('new-access-token',"true")

        // Attach payload to request
        req['user'] = this.jwtService.decode(newTokens.accessToken);
        return true;
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}