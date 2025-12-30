import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { NotificationService } from './notification.service';
import { NotificationType } from './notification.schema';
import { Expense, ExpenseDocument } from '../expenses/expense.schema';
import { SignUpSchema, signUpSchemaDocument } from '../signup/signup.schema';

@Injectable()
export class NotificationScheduler {
  constructor(
    private notificationService: NotificationService,
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
    @InjectModel(SignUpSchema.name) private signUpModel: Model<signUpSchemaDocument>,
  ) {}

  /**
   * Get current date in IST (for date calculations)
   */
  private getCurrentISTDate(): Date {
    const now = new Date();
    // IST is UTC+5:30, so we add 5:30 hours
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset);
  }

  /**
   * Get start and end of day in UTC (for querying expenses)
   */
  private getDayRange(date: Date): { start: Date; end: Date } {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    return { start, end };
  }

  /**
   * Get start and end of week in UTC (Monday to Sunday)
   */
  private getWeekRange(date: Date): { start: Date; end: Date } {
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - daysToMonday);
    monday.setUTCHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
  }

  /**
   * Calculate total spending for a user in a date range
   */
  private async calculateSpending(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const expenses = await this.expenseModel
      .find({
        user_id: userId,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .exec();

    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }

  /**
   * Get top spending categories for a user in a date range
   */
  private async getTopCategories(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 3,
  ): Promise<Array<{ category: string; amount: number }>> {
    const expenses = await this.expenseModel
      .find({
        user_id: userId,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .exec();

    const categoryMap = new Map<string, number>();

    expenses.forEach((expense) => {
      const category = expense.category_name || expense.category_id;
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + expense.amount);
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  /**
   * Check for recurring expenses that need reminders
   * Runs daily at 9:00 AM IST (3:30 AM UTC)
   */
  @Cron('30 3 * * *', {
    name: 'billReminders',
    timeZone: 'Asia/Kolkata',
  })
  async handleBillReminders() {
    console.log('Running bill reminders cron job...');
    
    try {
      const users = await this.signUpModel.find({}).exec();
      const currentDate = this.getCurrentISTDate();
      const dayOfMonth = currentDate.getUTCDate();

      for (const user of users) {
        const userId = (user._id as any).toString();

        // Find recurring expenses for this user
        const recurringExpenses = await this.expenseModel
          .find({
            user_id: userId,
            is_recurring: true,
          })
          .exec();

        for (const expense of recurringExpenses) {
          // Check if we need to send a reminder
          // For monthly recurring expenses, check if it's the same day of month
          // For weekly, check if it's the same day of week
          // For daily, always remind

          const expenseDate = new Date(expense.date);
          const expenseDayOfMonth = expenseDate.getUTCDate();
          const expenseDayOfWeek = expenseDate.getUTCDay();

          let shouldRemind = false;

          // Simple logic: if expense date matches current date pattern, remind
          // This is a basic implementation - can be enhanced with more sophisticated logic
          if (expenseDayOfMonth === dayOfMonth) {
            shouldRemind = true;
          }

          if (shouldRemind) {
            // Check if we already sent a reminder today
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

            const existingNotification = await this.notificationService.findAll(
              userId,
              {
                type: NotificationType.BILL_REMINDER,
                limit: 1,
              },
            );

            const todayNotification = existingNotification.find((n) => {
              if (!n.createdAt) return false;
              const notifDate = new Date(n.createdAt);
              return notifDate >= today && notifDate < tomorrow;
            });

            if (!todayNotification) {
              await this.notificationService.create(
                userId,
                NotificationType.BILL_REMINDER,
                `Bill Reminder: ${expense.category_name || expense.category_id}`,
                `Don't forget to pay ₹${expense.amount.toFixed(2)} for ${expense.category_name || expense.category_id}${expense.description ? ` - ${expense.description}` : ''}`,
                {
                  expense_id: (expense._id as any).toString(),
                  recurring_id: expense.recurring_id,
                  amount: expense.amount,
                  category: expense.category_name || expense.category_id,
                },
              );
            }
          }
        }
      }

      console.log('Bill reminders cron job completed');
    } catch (error) {
      console.error('Error in bill reminders cron job:', error);
    }
  }

  /**
   * Send daily spending summary
   * Runs daily at 9:00 PM IST (3:30 PM UTC)
   */
  @Cron('30 15 * * *', {
    name: 'dailySpendingSummary',
    timeZone: 'Asia/Kolkata',
  })
  async handleDailySpendingSummary() {
    console.log('Running daily spending summary cron job...');

    try {
      const users = await this.signUpModel.find({}).exec();
      const currentDate = this.getCurrentISTDate();
      const { start, end } = this.getDayRange(currentDate);

      for (const user of users) {
        const userId = (user._id as any).toString();

        const totalSpending = await this.calculateSpending(userId, start, end);
        const topCategories = await this.getTopCategories(userId, start, end, 3);

        if (totalSpending > 0) {
          const categorySummary = topCategories
            .map((cat) => `${cat.category}: ₹${cat.amount.toFixed(2)}`)
            .join(', ');

          await this.notificationService.create(
            userId,
            NotificationType.SPENDING_SUMMARY,
            'Daily Spending Summary',
            `You spent ₹${totalSpending.toFixed(2)} today. Top categories: ${categorySummary || 'N/A'}`,
            {
              total_spending: totalSpending,
              top_categories: topCategories,
              date: currentDate.toISOString(),
              period: 'daily',
            },
          );
        }
      }

      console.log('Daily spending summary cron job completed');
    } catch (error) {
      console.error('Error in daily spending summary cron job:', error);
    }
  }

  /**
   * Send weekly spending summary
   * Runs every Sunday at 9:00 PM IST (3:30 PM UTC)
   */
  @Cron('30 15 * * 0', {
    name: 'weeklySpendingSummary',
    timeZone: 'Asia/Kolkata',
  })
  async handleWeeklySpendingSummary() {
    console.log('Running weekly spending summary cron job...');

    try {
      const users = await this.signUpModel.find({}).exec();
      const currentDate = this.getCurrentISTDate();
      const { start, end } = this.getWeekRange(currentDate);

      for (const user of users) {
        const userId = (user._id as any).toString();

        const totalSpending = await this.calculateSpending(userId, start, end);
        const topCategories = await this.getTopCategories(userId, start, end, 5);
        const averageDaily = totalSpending / 7;

        if (totalSpending > 0) {
          const categorySummary = topCategories
            .map((cat) => `${cat.category}: ₹${cat.amount.toFixed(2)}`)
            .join(', ');

          await this.notificationService.create(
            userId,
            NotificationType.SPENDING_SUMMARY,
            'Weekly Spending Summary',
            `You spent ₹${totalSpending.toFixed(2)} this week (avg ₹${averageDaily.toFixed(2)}/day). Top categories: ${categorySummary || 'N/A'}`,
            {
              total_spending: totalSpending,
              average_daily: averageDaily,
              top_categories: topCategories,
              start_date: start.toISOString(),
              end_date: end.toISOString(),
              period: 'weekly',
            },
          );
        }
      }

      console.log('Weekly spending summary cron job completed');
    } catch (error) {
      console.error('Error in weekly spending summary cron job:', error);
    }
  }
}

