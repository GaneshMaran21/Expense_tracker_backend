import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.gurad';
import { UserService } from './user.service';

@ApiTags('User Details')
@Controller('user')
@UseGuards(AuthGuard)
@ApiBearerAuth('access-token')
export class UserController {
    constructor(private readonly userService : UserService) {}
    @ApiOperation({ summary: 'Get user details by user name' })
    @Get(':user_name')
  @ApiParam({
    name: 'user_name',
    required: true,
    description: 'The username of the user to fetch details for',
    example: 'ganesh',
  })
  async getUserDetailsbyUserName(@Param('user_name') user_name: string) {
    
    return this.userService.getUserDetails(user_name);
  }
}
