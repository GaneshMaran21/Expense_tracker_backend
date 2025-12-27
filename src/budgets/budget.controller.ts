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
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { UpdateBudgetDto } from '../dto/update-budget.dto';
import { AuthGuard } from '../auth/auth.gurad';

@Controller('budgets')
@UseGuards(AuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  create(@Body() createBudgetDto: CreateBudgetDto, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.budgetService.create(createBudgetDto, userId.toString());
  }

  @Get()
  findAll(@Request() req, @Query() filters: { is_active?: string }) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    const isActive = filters?.is_active === 'true' ? true : filters?.is_active === 'false' ? false : undefined;
    return this.budgetService.findAll(userId.toString(), { is_active: isActive });
  }

  @Get('with-status')
  getAllWithStatus(@Request() req, @Query() filters: { is_active?: string }) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    const isActive = filters?.is_active === 'true' ? true : filters?.is_active === 'false' ? false : undefined;
    return this.budgetService.getAllBudgetsWithStatus(userId.toString(), { is_active: isActive });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.budgetService.findOne(id, userId.toString());
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.budgetService.getBudgetStatus(id, userId.toString());
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.budgetService.update(id, updateBudgetDto, userId.toString());
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.user_id || req.user?.user_name;
    if (!userId) {
      throw new BadRequestException('User ID not found in token. Please login again.');
    }
    return this.budgetService.remove(id, userId.toString());
  }
}

