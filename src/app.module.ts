import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SignUpModule } from './signup/signup.module';
import { SignInModule } from './signin/signin.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './user/user.module';
import { ExpenseModule } from './expenses/expense.module';
import { BudgetModule } from './budgets/budget.module';
import { NotificationModule } from './notifications/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron jobs
    ConfigModule.forRoot({
      isGlobal: true, // makes ConfigService available everywhere
    }),
     MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_DB'),
      }),
      inject: [ConfigService],
    }),
     JwtModule.registerAsync({
      imports:[ConfigModule],
      useFactory:async(configService:ConfigService)=>({
        secret:configService.get<string>('JWT_SECRET')
      }),
      inject:[ConfigService]
    }),
    SignUpModule,
    SignInModule,
    AuthModule,
    UserModule,
    ExpenseModule,
    BudgetModule,
    NotificationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
