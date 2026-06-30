import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'Ganesh21 or ganesh@email.com',
    description: 'Username or email address',
  })
  @IsString()
  @MinLength(2)
  identifier: string;
}
