import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateExpenseDto {
  @IsNumber()
  amount: number;

  @IsString()
  category_id: string;

  @IsOptional()
  @IsString()
  category_name?: string;

  @IsOptional()
  @Transform(({ value }) => {
    // Accept both Date objects and ISO strings
    // Frontend sends ISO strings (UTC), we'll store as UTC
    // Plugin will convert to IST when reading
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  })
  @IsDate()
  date?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['cash', 'card', 'upi', 'bank_transfer', 'other'])
  payment_method?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  receipt_image_url?: string;

  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @IsOptional()
  @IsString()
  recurring_id?: string;
}

