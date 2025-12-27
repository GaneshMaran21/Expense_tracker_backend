import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDate, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category_id?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(['weekly', 'monthly', 'yearly', 'custom'])
  period?: string;

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
  alert_threshold?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

