import { BadRequestException, Body, Controller, Param, Post, Res, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { AuthService } from './auth.service';
import { loginUserDto } from './dto/login-user.dto';
import type { Response } from 'express';
import { Role } from '@prisma/client';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(':role/login')
  async login(
    @Param('role') role: string,
    @Body() dto: loginUserDto,
    @Res() res: Response,
  ) {
    let result: { message: string; token: string; role: string };
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

    @Get('auth/me')
    @UseGuards(AuthGuard)
    async getMe(@Req() req: any) {
        // req.user contains the decoded JWT payload injected by AuthGuard
        return this.authService.getMe(req.user);
    }

    @Post('auth/logout')
    async logout(@Res() res: Response) {
        res.clearCookie('access_token', {
            httpOnly: true,
            path: '/',
        });
        return res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
}

const USER_ROLES = [Role.SUPERADMIN, Role.ADMIN, Role.CREATOR] as string[];
