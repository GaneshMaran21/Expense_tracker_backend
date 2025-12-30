import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { Budget, BudgetSchema } from './budget.schema';
import { AuthModule } from '../auth/auth.module';
import { Expense, ExpenseSchema } from '../expenses/expense.schema';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Budget.name, schema: BudgetSchema },
      { name: Expense.name, schema: ExpenseSchema }, // Needed for spending calculations
    ]),
    AuthModule, // Import AuthModule to make AuthGuard available
    NotificationModule, // Import NotificationModule to create budget alerts
  ],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}

