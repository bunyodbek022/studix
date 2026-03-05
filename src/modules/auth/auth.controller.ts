import { Body, Controller, Param, Post, Res } from '@nestjs/common';
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
        const result = await this.authService[`login${role[0].toUpperCase() + role.slice(1)}`](dto);

        res.cookie('token', result.token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({
            success: true,
            message: `${role} signed in`,
            token: result.token,
        });
    }



}
