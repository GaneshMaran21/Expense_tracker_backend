import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { AuthGuard } from '../auth/auth.gurad';

@Controller('expenses')
@UseGuards(AuthGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    // JWT payload has 'userId' field (from signin.service.ts line 44)
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    // Convert to string if it's an ObjectId
    const userIdString = userId.toString();
    return this.expenseService.create(createExpenseDto, userIdString);
  }

  @Get()
  findAll(@Request() req, @Query() filters: any) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.expenseService.findAll(userId.toString(), filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.expenseService.findOne(id, userId.toString());
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.expenseService.update(id, updateExpenseDto, userId.toString());
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.expenseService.remove(id, userId.toString());
  }

  @Post('sync')
  sync(@Body() body: { expenses: any[] }, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.expenseService.syncExpenses(userId.toString(), body.expenses);
  }
}

