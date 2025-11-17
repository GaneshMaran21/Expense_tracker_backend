import { Body, Controller, NotFoundException, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SignInDto } from "src/dto/signin.dto";
import { SignInService } from "./signin.service";
import type { Response, Request } from "express";

@ApiTags('Sign In')
@Controller('signin')
export class SignInController {
  constructor(private readonly signInService: SignInService) {}

@Post()
@ApiOperation({ summary: "Login or SignIn" })
async signinUser(
  @Body() data: SignInDto,
  @Res({ passthrough: true }) res: Response,
  @Req() req: Request
) {
  try {
    const { accessToken, refreshToken, user_name } =
      await this.signInService.siginUser(data);

    const clientType =
      req.headers["x-client-type"] ||
      (req.headers["user-agent"]?.includes("okhttp") ? "mobile" : "web");

    if (clientType === "web") {
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });
    }
    res.setHeader('new-access-token','true')

    return {
      message: "Login successful",
      accessToken,
      refreshToken,
      user_name,
    };
  } catch (err) {
    if (err instanceof UnauthorizedException) {
      res.status(401).json({
        statusCode: 401,
        message: err.message,
      });
    } else if (err instanceof NotFoundException) {
      res.status(404).json({
        statusCode: 404,
        message: err.message,
      });
    } else {
      res.status(500).json({
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }
}}