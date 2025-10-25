import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator"

export class SignInDto{
    @ApiProperty({example:"Ganesh21 or ganeshKumaran@gmail.com",required:true})
    @IsString()
    user_name:string

    @ApiProperty({example:"password",required:true})
    @IsString()
   @MinLength(8, { message: 'Password must be at least 8 characters long' })
   @MaxLength(20, { message: 'Password cannot exceed 20 characters' })
   @Matches(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
   @Matches(/(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter' })
   @Matches(/(?=.*[0-9])/, { message: 'Password must contain at least one number' })
   @Matches(/(?=.*[!@#$%^&*])/, { message: 'Password must contain at least one special character (!@#$%^&*)' })
   password:string
} 
 
