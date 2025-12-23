import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from './expense.schema';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto, userId: string): Promise<Expense> {
    // The date comes from frontend as ISO string
    // Frontend sends UTC equivalent of midnight IST for the selected date
    // We store it as-is in UTC (MongoDB stores dates in UTC)
    let dateToSave: Date;
    if (createExpenseDto.date) {
      // Parse the date string - frontend sends UTC equivalent of midnight IST
      dateToSave = new Date(createExpenseDto.date);
    } else {
      // If no date provided, use current date at midnight UTC
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      dateToSave = now;
    }
    
    const expense = new this.expenseModel({
      ...createExpenseDto,
      user_id: userId,
      date: dateToSave,
      is_synced: true,
    });
    const savedExpense = await expense.save();
    // Convert to plain object to ensure toJSON transform is called
    return savedExpense.toJSON();
  }

  async findAll(userId: string, filters?: any): Promise<Expense[]> {
    const query: any = { user_id: userId };

    // Apply filters
    // Date filters: the date field is stored as UTC equivalent of midnight IST
    if (filters?.start_date || filters?.end_date) {
      query.date = {};
      if (filters?.start_date) {
        const startDate = new Date(filters.start_date);
        query.date.$gte = startDate;
      }
      if (filters?.end_date) {
        const endDate = new Date(filters.end_date);
        query.date.$lte = endDate;
      }
    }
    if (filters?.category_id) {
      query.category_id = filters.category_id;
    }
    if (filters?.payment_method) {
      query.payment_method = filters.payment_method;
    }
    if (filters?.min_amount) {
      query.amount = { ...query.amount, $gte: filters.min_amount };
    }
    if (filters?.max_amount) {
      query.amount = { ...query.amount, $lte: filters.max_amount };
    }

    // Sort options: default to createdAt descending (newest first)
    // sortBy: 'createdAt' | 'amount'
    // sortOrder: 'asc' | 'desc'
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 1 : -1;
    const sortField = sortBy === 'amount' ? 'amount' : 'createdAt';
    const sortOptions: any = { [sortField]: sortOrder };

    const expenses = await this.expenseModel.find(query).sort(sortOptions).exec();
    // Convert to plain objects to ensure toJSON transform is called
    const jsonResults = expenses.map(exp => exp.toJSON()) as any[];
    return jsonResults;
  }

  async findOne(id: string, userId: string): Promise<Expense> {
    const expense = await this.expenseModel.findOne({ _id: id, user_id: userId }).exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    // Convert to plain object to ensure toJSON transform is called
    return expense.toJSON();
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto, userId: string): Promise<Expense> {
    const expense = await this.expenseModel.findOne({ _id: id, user_id: userId }).exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    Object.assign(expense, updateExpenseDto);
    expense.is_synced = true;
    const savedExpense = await expense.save();
    // Convert to plain object to ensure toJSON transform is called
    return savedExpense.toJSON();
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.expenseModel.deleteOne({ _id: id, user_id: userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Expense not found');
    }
  }

  async syncExpenses(userId: string, expenses: any[]): Promise<Array<{ id: string; action: string }>> {
    // Handle bulk sync from mobile app
    const results: Array<{ id: string; action: string }> = [];
    
    for (const expense of expenses) {
      if (expense._id) {
        // Update existing
        const existing = await this.expenseModel.findOne({ _id: expense._id, user_id: userId });
        if (existing) {
          Object.assign(existing, expense, { is_synced: true });
          await existing.save();
          results.push({ id: expense._id.toString(), action: 'updated' });
        }
      } else {
        // Create new
        const newExpense = new this.expenseModel({
          ...expense,
          user_id: userId,
          is_synced: true,
        });
        const savedExpense = await newExpense.save();
        results.push({ id: savedExpense.id, action: 'created' });
      }
    }

    return results;
  }
}

