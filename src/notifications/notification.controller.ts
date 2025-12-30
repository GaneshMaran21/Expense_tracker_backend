import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/auth.gurad';
import { NotificationType } from './notification.schema';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(
    @Request() req,
    @Query() filters: { is_read?: string; type?: NotificationType; limit?: string; skip?: string },
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }

    const options: any = {};
    if (filters?.is_read !== undefined) {
      options.is_read = filters.is_read === 'true';
    }
    if (filters?.type) {
      options.type = filters.type;
    }
    if (filters?.limit) {
      options.limit = parseInt(filters.limit, 10);
    }
    if (filters?.skip) {
      options.skip = parseInt(filters.skip, 10);
    }

    return this.notificationService.findAll(userId.toString(), options);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.notificationService.getUnreadCount(userId.toString());
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.notificationService.findOne(id, userId.toString());
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.notificationService.markAsRead(id, userId.toString());
  }

  @Patch('mark-all-read')
  markAllAsRead(@Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.notificationService.markAllAsRead(userId.toString());
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.notificationService.remove(id, userId.toString());
  }

  @Delete('read/all')
  deleteAllRead(@Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.notificationService.deleteAllRead(userId.toString());
  }

  /**
   * TEST ENDPOINT: Create a test notification
   * This is useful for testing the notification system
   */
  @Post('test')
  createTestNotification(@Request() req, @Body() body: { type?: string; title?: string; message?: string }) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }

    const type = body.type || 'spending_summary';
    const title = body.title || 'Test Notification';
    const message = body.message || 'This is a test notification to verify the notification system is working.';

    return this.notificationService.create(
      userId.toString(),
      type as any,
      title,
      message,
      { test: true, created_at: new Date().toISOString() },
    );
  }
}

