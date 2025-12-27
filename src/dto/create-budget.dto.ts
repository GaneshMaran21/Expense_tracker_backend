import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDate, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBudgetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category_id?: string | null; // null for overall budget, category_id for category-specific

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['weekly', 'monthly', 'yearly', 'custom'])
  period: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  })
  @IsDate()
  start_date?: Date;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  })
  @IsDate()
  end_date?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  alert_threshold?: number; // Default 80

  @IsOptional()
  @IsBoolean()
  is_active?: boolean; // Default true
}

