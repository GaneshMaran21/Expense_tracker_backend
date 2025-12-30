import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget, BudgetDocument } from './budget.schema';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { UpdateBudgetDto } from '../dto/update-budget.dto';
import { Expense, ExpenseDocument } from '../expenses/expense.schema';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '../notifications/notification.schema';

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
    private notificationService: NotificationService,
  ) {}

  /**
   * Calculate default start and end dates based on period type
   */
  private calculatePeriodDates(period: string): { start_date: Date; end_date: Date } {
    const now = new Date();
    let start_date: Date;
    let end_date: Date;

    switch (period) {
      case 'weekly':
        // Start of current week (Monday)
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start_date = new Date(now);
        start_date.setDate(now.getDate() - daysToMonday);
        start_date.setUTCHours(0, 0, 0, 0);
        
        end_date = new Date(start_date);
        end_date.setDate(start_date.getDate() + 6);
        end_date.setUTCHours(23, 59, 59, 999);
        break;

      case 'monthly':
        // Start of current month
        start_date = new Date(now.getFullYear(), now.getMonth(), 1);
        start_date.setUTCHours(0, 0, 0, 0);
        
        // End of current month
        end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end_date.setUTCHours(23, 59, 59, 999);
        break;

      case 'yearly':
        // Start of current year
        start_date = new Date(now.getFullYear(), 0, 1);
        start_date.setUTCHours(0, 0, 0, 0);
        
        // End of current year
        end_date = new Date(now.getFullYear(), 11, 31);
        end_date.setUTCHours(23, 59, 59, 999);
        break;

      default: // 'custom'
        // For custom, dates should be provided by user
        start_date = new Date(now);
        start_date.setUTCHours(0, 0, 0, 0);
        end_date = new Date(now);
        end_date.setDate(now.getDate() + 30); // Default 30 days
        end_date.setUTCHours(23, 59, 59, 999);
        break;
    }

    return { start_date, end_date };
  }

  /**
   * Check if a budget is currently active based on date range
   * A budget is active if the current date (in IST) falls within its date range
   * Budget dates are stored as UTC equivalent of midnight IST
   * We compare by extracting date portions (YYYY-MM-DD) in IST
   */
  private isBudgetCurrentlyActive(startDate: Date | string, endDate: Date | string): boolean {
    // Ensure we have Date objects (dates from toJSON() might be strings)
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    // Get current date in IST
    // Current UTC time + 5:30 hours = IST time, then extract UTC date components (which represent IST date)
    const now = new Date();
    const istNow = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
    const currentYear = istNow.getUTCFullYear();
    const currentMonth = istNow.getUTCMonth();
    const currentDay = istNow.getUTCDate();
    const currentDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    
    // Budget dates are stored as UTC equivalent of midnight IST
    // Example: Dec 26 00:00 IST is stored as Dec 25 18:30:00 UTC
    // To get the IST date: add 5:30 hours, then extract UTC date components
    const startIST = new Date(start.getTime() + (5 * 60 + 30) * 60 * 1000);
    const startYear = startIST.getUTCFullYear();
    const startMonth = startIST.getUTCMonth();
    const startDay = startIST.getUTCDate();
    const startDateStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    
    const endIST = new Date(end.getTime() + (5 * 60 + 30) * 60 * 1000);
    const endYear = endIST.getUTCFullYear();
    const endMonth = endIST.getUTCMonth();
    const endDay = endIST.getUTCDate();
    const endDateStr = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    
    // Compare date strings (YYYY-MM-DD format allows string comparison)
    return currentDateStr >= startDateStr && currentDateStr <= endDateStr;
  }

  /**
   * Calculate total spending for a budget period
   * Each budget counts expenses independently based on its own date range and category
   * Note: Budget dates are stored as UTC equivalent of midnight IST (from frontend)
   * Expense dates are also stored as UTC equivalent of midnight IST
   * So we can compare them directly without normalization
   */
  private async calculateSpending(
    userId: string,
    categoryId: string | null,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Ensure dates are proper Date objects for MongoDB query
    // startDate is UTC equivalent of midnight IST on start day
    // endDate is UTC equivalent of 23:59:59.999 IST on end day (already set by frontend)
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const query: any = {
      user_id: userId,
      date: {
        $gte: start,
        $lte: end,
      },
    };

    // If category_id is provided, filter by category; otherwise get all expenses
    if (categoryId) {
      query.category_id = categoryId;
    }

    const expenses = await this.expenseModel.find(query).exec();
    const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return totalSpending;
  }

  async create(createBudgetDto: CreateBudgetDto, userId: string): Promise<Budget> {
    let start_date: Date;
    let end_date: Date;

    // If dates are provided, use them; otherwise calculate based on period
    if (createBudgetDto.start_date && createBudgetDto.end_date) {
      start_date = new Date(createBudgetDto.start_date);
      end_date = new Date(createBudgetDto.end_date);
    } else {
      const periodDates = this.calculatePeriodDates(createBudgetDto.period);
      start_date = periodDates.start_date;
      end_date = periodDates.end_date;
    }

    const budget = new this.budgetModel({
      ...createBudgetDto,
      user_id: userId,
      start_date,
      end_date,
      alert_threshold: createBudgetDto.alert_threshold ?? 80,
      is_active: createBudgetDto.is_active ?? true,
      category_id: createBudgetDto.category_id || null,
    });

    const savedBudget = await budget.save();
    return savedBudget.toJSON();
  }

  async findAll(userId: string, filters?: { is_active?: boolean }): Promise<Budget[]> {
    const query: any = { user_id: userId };
    
    // Always filter by is_active flag if provided (for manual archiving)
    if (filters?.is_active !== undefined) {
      query.is_active = filters.is_active;
    }

    const budgets = await this.budgetModel.find(query).sort({ createdAt: -1 }).exec();
    let result = budgets.map(budget => budget.toJSON());
    
    // If filtering for active budgets, also check if they're currently within date range
    if (filters?.is_active === true) {
      result = result.filter(budget => {
        const startDate = new Date(budget.start_date);
        const endDate = new Date(budget.end_date);
        return this.isBudgetCurrentlyActive(startDate, endDate);
      });
    }
    
    return result;
  }

  async findOne(id: string, userId: string): Promise<Budget> {
    const budget = await this.budgetModel.findOne({ _id: id, user_id: userId }).exec();
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget.toJSON();
  }

  async update(id: string, updateBudgetDto: UpdateBudgetDto, userId: string): Promise<Budget> {
    const budget = await this.budgetModel.findOne({ _id: id, user_id: userId }).exec();
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // If period or dates are being updated, recalculate dates if needed
    if (updateBudgetDto.period && !updateBudgetDto.start_date && !updateBudgetDto.end_date) {
      const periodDates = this.calculatePeriodDates(updateBudgetDto.period);
      budget.start_date = periodDates.start_date;
      budget.end_date = periodDates.end_date;
    }

    Object.assign(budget, updateBudgetDto);
    const savedBudget = await budget.save();
    return savedBudget.toJSON();
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.budgetModel.deleteOne({ _id: id, user_id: userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Budget not found');
    }
  }

  /**
   * Create notification for budget alerts (threshold or over budget)
   * Only creates notification if it hasn't been sent today
   * Uses notification collection check to prevent duplicates (more reliable than last_alert_date)
   */
  private async createBudgetNotification(
    userId: string,
    budget: BudgetDocument,
    spending: number,
    percentageUsed: number,
    isOverBudget: boolean,
  ): Promise<void> {
    // Determine notification type and details first
    let notificationType: NotificationType;
    let title: string;
    let message: string;

    if (isOverBudget) {
      // Budget exceeded
      notificationType = NotificationType.BUDGET_ALERT;
      const overBy = spending - budget.amount;
      title = `Budget Exceeded: ${budget.name}`;
      message = `You've exceeded your ${budget.name} budget by ₹${overBy.toFixed(2)}. Current spending: ₹${spending.toFixed(2)} / ₹${budget.amount.toFixed(2)}`;
    } else if (percentageUsed >= budget.alert_threshold) {
      // Budget threshold reached
      notificationType = NotificationType.BUDGET_THRESHOLD;
      title = `Budget Alert: ${budget.name}`;
      message = `You've used ${percentageUsed.toFixed(1)}% of your ${budget.name} budget. Current spending: ₹${spending.toFixed(2)} / ₹${budget.amount.toFixed(2)}`;
    } else {
      // No notification needed
      return;
    }

    // Check if a notification of this type for this budget already exists today
    // This prevents duplicates even if multiple calls happen simultaneously
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const budgetId = (budget._id as any).toString();
    
    // Check for existing notification of same type for this budget today
    const hasExistingNotification = await this.notificationService.hasNotificationToday(
      userId,
      notificationType,
      budgetId,
      todayStart,
      todayEnd,
    );
    
    // If notification already exists for today, skip creating a new one
    if (hasExistingNotification) {
      return;
    }

    // Create notification
    await this.notificationService.create(
      userId,
      notificationType,
      title,
      message,
      {
        budget_id: budgetId,
        budget_name: budget.name,
        spending,
        budget_amount: budget.amount,
        percentage_used: percentageUsed,
        is_over_budget: isOverBudget,
      },
    );

    // Update last_alert_date for tracking
    budget.last_alert_date = now;
    await budget.save();
  }

  /**
   * Get budget status with spending calculation
   */
  async getBudgetStatus(id: string, userId: string): Promise<any> {
    const budget = await this.budgetModel.findOne({ _id: id, user_id: userId }).exec();
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const spending = await this.calculateSpending(
      userId,
      budget.category_id,
      budget.start_date,
      budget.end_date,
    );

    const percentageUsed = (spending / budget.amount) * 100;
    const remaining = Math.max(0, budget.amount - spending);
    const isOverBudget = spending > budget.amount;
    const shouldAlert = percentageUsed >= budget.alert_threshold && !isOverBudget;
    const isOverThreshold = percentageUsed >= budget.alert_threshold;

    // Create notification if needed (non-blocking)
    this.createBudgetNotification(userId, budget, spending, percentageUsed, isOverBudget).catch(
      (error) => {
        // Log error but don't fail the request
        console.error('Error creating budget notification:', error);
      },
    );

    return {
      ...budget.toJSON(),
      spending,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100, // Round to 2 decimal places
      isOverBudget,
      shouldAlert,
      isOverThreshold,
    };
  }

  /**
   * Get all budgets with their statuses
   */
  async getAllBudgetsWithStatus(userId: string, filters?: { is_active?: boolean }): Promise<any[]> {
    // Get raw budgets (not JSON) to have access to _id for queries
    const query: any = { user_id: userId };
    // Always filter by is_active flag if provided (for manual archiving)
    if (filters?.is_active !== undefined) {
      query.is_active = filters.is_active;
    }
    let rawBudgets = await this.budgetModel.find(query).sort({ createdAt: -1 }).exec();
    
    // If filtering for active budgets, filter BEFORE calculating spending (using raw Date objects)
    if (filters?.is_active === true) {
      rawBudgets = rawBudgets.filter(budget => {
        return this.isBudgetCurrentlyActive(budget.start_date, budget.end_date);
      });
    }
    
    const budgetsWithStatus = await Promise.all(
      rawBudgets.map(async (budget) => {
        const spending = await this.calculateSpending(
          userId,
          budget.category_id,
          budget.start_date,
          budget.end_date,
        );

        const percentageUsed = (spending / budget.amount) * 100;
        const remaining = Math.max(0, budget.amount - spending);
        const isOverBudget = spending > budget.amount;
        const shouldAlert = percentageUsed >= budget.alert_threshold && !isOverBudget;
        const isOverThreshold = percentageUsed >= budget.alert_threshold;

        // Create notification if needed (non-blocking)
        this.createBudgetNotification(userId, budget, spending, percentageUsed, isOverBudget).catch(
          (error) => {
            // Log error but don't fail the request
            console.error('Error creating budget notification:', error);
          },
        );

        return {
          ...budget.toJSON(),
          spending,
          remaining,
          percentageUsed: Math.round(percentageUsed * 100) / 100,
          isOverBudget,
          shouldAlert,
          isOverThreshold,
        };
      }),
    );

    return budgetsWithStatus;
  }
}

