import { Body, Controller, Post, Req, Res } from "@nestjs/common";
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
    const { accessToken, refreshToken,user_name } = await this.signInService.siginUser(data);

    // 🔍 Detect client type
    const clientType =
      req.headers["x-client-type"] ||
      (req.headers["user-agent"]?.includes("okhttp") ? "mobile" : "web");
      res.setHeader('new-access-token',"true")
    if (clientType === "web") {
      // 🍪 Web: send as cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: true, // enable in production with HTTPS
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });

      return { message: "Login successful (web)",accessToken,user_name };
    } else {
      // 📱 Mobile: send in JSON response
      return {
        message: "Login successful (mobile)",
        accessToken,
        refreshToken,
        user_name,
      };
    }
  }
}