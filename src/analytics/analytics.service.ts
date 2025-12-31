import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from '../expenses/expense.schema';

export interface SpendingTrend {
  date: string;
  amount: number;
  count: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  total: number;
  count: number;
  percentage: number;
}

export interface PaymentMethodAnalysis {
  payment_method: string;
  total: number;
  count: number;
  percentage: number;
}

export interface SpendingForecast {
  period: string;
  projected: number;
  average: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
  ) {}

  /**
   * Get spending trends for a given period
   * @param userId - User ID
   * @param period - 'week' | 'month' | 'year'
   * @returns Array of daily/weekly/monthly spending data
   */
  async getSpendingTrends(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month',
  ): Promise<SpendingTrend[]> {
    const now = new Date();
    let startDate: Date;
    let groupFormat: any;

    // Calculate start date based on period
    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      groupFormat = {
        year: { $year: '$date' },
        month: { $month: '$date' },
        day: { $dayOfMonth: '$date' },
      };
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupFormat = {
        year: { $year: '$date' },
        month: { $month: '$date' },
        day: { $dayOfMonth: '$date' },
      };
    } else {
      // year
      startDate = new Date(now.getFullYear(), 0, 1);
      groupFormat = {
        year: { $year: '$date' },
        month: { $month: '$date' },
      };
    }

    const pipeline: any[] = [
      {
        $match: {
          user_id: userId,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupFormat,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ];

    // Add sort stage based on period
    if (period === 'year') {
      pipeline.push({
        $sort: { '_id.year': 1, '_id.month': 1 },
      });
    } else {
      pipeline.push({
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      });
    }

    const results = await this.expenseModel.aggregate(pipeline).exec();

    return results.map((item) => {
      let dateStr: string;
      if (period === 'year') {
        dateStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      } else {
        dateStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      }
      return {
        date: dateStr,
        amount: item.total,
        count: item.count,
      };
    });
  }

  /**
   * Get category breakdown with totals and percentages
   * @param userId - User ID
   * @param period - Optional date range
   * @returns Array of category spending data
   */
  async getCategoryBreakdown(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CategoryBreakdown[]> {
    const matchQuery: any = { user_id: userId };
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = startDate;
      if (endDate) matchQuery.date.$lte = endDate;
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$category_id',
          category_name: { $first: '$category_name' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          categories: { $push: '$$ROOT' },
          grandTotal: { $sum: '$total' },
        },
      },
      {
        $unwind: '$categories',
      },
      {
        $project: {
          category_id: '$categories._id',
          category_name: '$categories.category_name',
          total: '$categories.total',
          count: '$categories.count',
          percentage: {
            $multiply: [
              { $divide: ['$categories.total', '$grandTotal'] },
              100,
            ],
          },
        },
      },
      { $sort: { total: -1 as const } },
    ];

    const results = await this.expenseModel.aggregate(pipeline).exec();
    return results.map((item) => ({
      category_id: item.category_id,
      category_name: item.category_name || item.category_id,
      total: item.total,
      count: item.count,
      percentage: Number(item.percentage.toFixed(2)),
    }));
  }

  /**
   * Get payment method analysis
   * @param userId - User ID
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Array of payment method spending data
   */
  async getPaymentMethodAnalysis(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaymentMethodAnalysis[]> {
    const matchQuery: any = { user_id: userId };
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = startDate;
      if (endDate) matchQuery.date.$lte = endDate;
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$payment_method',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          methods: { $push: '$$ROOT' },
          grandTotal: { $sum: '$total' },
        },
      },
      {
        $unwind: '$methods',
      },
      {
        $project: {
          payment_method: '$methods._id',
          total: '$methods.total',
          count: '$methods.count',
          percentage: {
            $multiply: [{ $divide: ['$methods.total', '$grandTotal'] }, 100],
          },
        },
      },
      { $sort: { total: -1 as const } },
    ];

    const results = await this.expenseModel.aggregate(pipeline).exec();
    return results.map((item) => ({
      payment_method: item.payment_method,
      total: item.total,
      count: item.count,
      percentage: Number(item.percentage.toFixed(2)),
    }));
  }

  /**
   * Get top spending categories
   * @param userId - User ID
   * @param limit - Number of top categories to return (default: 5)
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Array of top categories
   */
  async getTopCategories(
    userId: string,
    limit: number = 5,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CategoryBreakdown[]> {
    const breakdown = await this.getCategoryBreakdown(userId, startDate, endDate);
    return breakdown.slice(0, limit);
  }

  /**
   * Get spending forecast based on historical data
   * @param userId - User ID
   * @param period - 'week' | 'month' | 'year'
   * @returns Forecast data with projections
   */
  async getSpendingForecast(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month',
  ): Promise<SpendingForecast> {
    const now = new Date();
    let historicalStart: Date;
    let daysInPeriod: number;

    if (period === 'week') {
      historicalStart = new Date(now);
      historicalStart.setDate(now.getDate() - 30); // Use last 30 days for weekly forecast
      daysInPeriod = 7;
    } else if (period === 'month') {
      historicalStart = new Date(now);
      historicalStart.setMonth(now.getMonth() - 3); // Use last 3 months for monthly forecast
      daysInPeriod = 30;
    } else {
      historicalStart = new Date(now);
      historicalStart.setFullYear(now.getFullYear() - 2); // Use last 2 years for yearly forecast
      daysInPeriod = 365;
    }

    // Get historical spending
    const historicalExpenses = await this.expenseModel
      .find({
        user_id: userId,
        date: { $gte: historicalStart },
      })
      .exec();

    const totalSpending = historicalExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0,
    );
    const daysDiff = Math.max(
      1,
      Math.floor((now.getTime() - historicalStart.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const averageDaily = totalSpending / daysDiff;
    const projected = averageDaily * daysInPeriod;

    // Calculate trend (compare recent vs older spending)
    const midpoint = Math.floor(historicalExpenses.length / 2);
    const recentSpending = historicalExpenses
      .slice(midpoint)
      .reduce((sum, exp) => sum + exp.amount, 0);
    const olderSpending = historicalExpenses
      .slice(0, midpoint)
      .reduce((sum, exp) => sum + exp.amount, 0);

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentSpending > olderSpending * 1.1) {
      trend = 'increasing';
    } else if (recentSpending < olderSpending * 0.9) {
      trend = 'decreasing';
    }

    return {
      period,
      projected: Number(projected.toFixed(2)),
      average: Number(averageDaily.toFixed(2)),
      trend,
    };
  }

  /**
   * Get overall analytics summary
   * @param userId - User ID
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Combined analytics data
   */
  async getAnalyticsSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const [trends, categories, paymentMethods, topCategories, forecast] =
      await Promise.all([
        this.getSpendingTrends(userId, 'month'),
        this.getCategoryBreakdown(userId, startDate, endDate),
        this.getPaymentMethodAnalysis(userId, startDate, endDate),
        this.getTopCategories(userId, 5, startDate, endDate),
        this.getSpendingForecast(userId, 'month'),
      ]);

    return {
      trends,
      categories,
      paymentMethods,
      topCategories,
      forecast,
    };
  }
}

