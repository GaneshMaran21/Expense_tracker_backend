import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from './expense.schema';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { getCurrentIST, toUTC } from '../utils/istDate.plugin';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto, userId: string): Promise<Expense> {
    // Convert date to UTC before saving (plugin will handle IST conversion)
    const dateToSave = createExpenseDto.date 
      ? toUTC(createExpenseDto.date) 
      : toUTC(getCurrentIST());
    
    const expense = new this.expenseModel({
      ...createExpenseDto,
      user_id: userId,
      date: dateToSave,
      is_synced: true,
    });
    return expense.save();
  }

  async findAll(userId: string, filters?: any): Promise<Expense[]> {
    const query: any = { user_id: userId };

    // Apply filters
    if (filters?.start_date) {
      query.date = { ...query.date, $gte: new Date(filters.start_date) };
    }
    if (filters?.end_date) {
      query.date = { ...query.date, $lte: new Date(filters.end_date) };
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

    return this.expenseModel.find(query).sort({ date: -1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<Expense> {
    const expense = await this.expenseModel.findOne({ _id: id, user_id: userId }).exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto, userId: string): Promise<Expense> {
    const expense = await this.expenseModel.findOne({ _id: id, user_id: userId }).exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    Object.assign(expense, updateExpenseDto);
    expense.is_synced = true;
    return expense.save();
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

