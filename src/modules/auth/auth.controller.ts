import { BadRequestException, Body, Controller, Param, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginUserDto } from './dto/login-user.dto';
import type { Response } from 'express';


@Controller()
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post(':role/login')
    async login(
        @Param('role') role: 'student' | 'staff' | 'teacher',
        @Body() dto: loginUserDto,
        @Res() res: Response,
    ) {
        let result;

        if (role === 'student') {
            result = await this.authService.loginStudent(dto);
        } else if (role === 'staff') {
            result = await this.authService.loginUser(dto);
        } else if (role === 'teacher') {
            result = await this.authService.loginTeacher(dto);
        } else {
            throw new BadRequestException('Invalid role');
        }

        res.cookie('access_token', result.token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        console.log(result.role)
        return res.json({
            success: true,
            message: result.message,
            token: result.token,
            role: result.role
        });
    }



}
