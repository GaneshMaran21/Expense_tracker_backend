import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { 
  AnalyticsService,
  SpendingTrend,
  CategoryBreakdown,
  PaymentMethodAnalysis,
  SpendingForecast,
} from './analytics.service';
import { AuthGuard } from '../auth/auth.gurad';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('trends')
  async getTrends(@Request() req, @Query('period') period?: string): Promise<SpendingTrend[]> {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }

    const validPeriods = ['week', 'month', 'year'];
    const periodParam = period && validPeriods.includes(period) ? period : 'month';

    return this.analyticsService.getSpendingTrends(userId.toString(), periodParam as 'week' | 'month' | 'year');
  }

  @Get('categories')
  async getCategories(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<CategoryBreakdown[]> {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getCategoryBreakdown(userId.toString(), start, end);
  }

  @Get('payment-methods')
  async getPaymentMethods(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<PaymentMethodAnalysis[]> {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getPaymentMethodAnalysis(userId.toString(), start, end);
  }

  @Get('top-categories')
  async getTopCategories(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<CategoryBreakdown[]> {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }

    const limitNum = limit ? parseInt(limit, 10) : 5;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getTopCategories(userId.toString(), limitNum, start, end);
  }

  @Get('forecast')
  async getForecast(@Request() req, @Query('period') period?: string): Promise<SpendingForecast> {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }

    const validPeriods = ['week', 'month', 'year'];
    const periodParam = period && validPeriods.includes(period) ? period : 'month';

    return this.analyticsService.getSpendingForecast(userId.toString(), periodParam as 'week' | 'month' | 'year');
  }

  @Get('summary')
  async getSummary(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<{
    trends: SpendingTrend[];
    categories: CategoryBreakdown[];
    paymentMethods: PaymentMethodAnalysis[];
    topCategories: CategoryBreakdown[];
    forecast: SpendingForecast;
  }> {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getAnalyticsSummary(userId.toString(), start, end);
  }
}

