import { Body, Controller, Injectable, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SignUpDto } from "src/dto/signup.dto";
import { SignUpService } from "./signup.service";

@ApiTags('SignUP')
@Controller('signUp')
export class SignUpController{
    constructor(private readonly  signupService:SignUpService) { }
    @Post()
    @ApiOperation({summary:"Create a new user"})
    createUser(@Body() data:SignUpDto){
        return this.signupService.createUser(data)
    }
}

