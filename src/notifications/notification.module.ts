import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationScheduler } from './notification.scheduler';
import { Notification, NotificationSchema } from './notification.schema';
import { Expense, ExpenseSchema } from '../expenses/expense.schema';
import { SignUpSchema, signUpSchemaFact } from '../signup/signup.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: SignUpSchema.name, schema: signUpSchemaFact },
    ]),
    AuthModule, // Import AuthModule to make AuthGuard available
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationScheduler],
  exports: [NotificationService], // Export so other modules can use it
})
export class NotificationModule {}

