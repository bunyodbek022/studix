import { BadRequestException, Body, Controller, Param, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginUserDto } from './dto/login-user.dto';
import type { Response } from 'express';
import { Role } from '@prisma/client';


@Controller()
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post(':role/login')
    async login(
        @Param('role') role: string,
        @Body() dto: loginUserDto,
        @Res() res: Response,
    ) {
        let result;
        const roleParam = role.toUpperCase();

        if (roleParam === Role.STUDENT) {
            result = await this.authService.loginStudent(dto);
        } else if (roleParam === 'STAFF') {
            result = await this.authService.loginUser(dto);
        } else if (roleParam === Role.TEACHER) {
            result = await this.authService.loginTeacher(dto);
        } else if (USER_ROLES.includes(roleParam)) {
            result = await this.authService.loginUser(dto);

            if (result.role !== roleParam) {
                throw new BadRequestException('Invalid role');
            }
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

const USER_ROLES = [
    Role.SUPERADMIN,
    Role.ADMIN,
    Role.MANAGEMENT,
    Role.ADMINISTRATOR,
] as string[];
