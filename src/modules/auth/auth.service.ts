import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import PrismaService from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async loginStudent(data: loginUserDto) {
    const studentExist = await this.prisma.student.findFirst({
      where: { email: data.email },
    });
    if (!studentExist) {
      throw new NotFoundException('Student not found');
    }
    const isMatch = await bcrypt.compare(data.password, studentExist.password);

    if (!isMatch) throw new BadRequestException('email or password incorrect');

    const token = this.jwtService.sign({
      id: studentExist.id,
      role: Role.STUDENT,
      email: studentExist.email,
      branchId: studentExist.branchId,
    });

    return {
      success: true,
      token,
      role: Role.STUDENT,
      message: 'Student sign in successfully',
    };
  }

  async loginUser(data: loginUserDto) {
    const userExist = await this.prisma.user.findFirst({
      where: { email: data.email },
    });

    if (!userExist) {
      throw new NotFoundException('user not found');
    }
    const isMatch = await bcrypt.compare(data.password, userExist.password);
    if (!isMatch) throw new BadRequestException('email or password incorrect');
    const token = this.jwtService.sign({
      id: userExist.id,
      email: userExist.email,
      role: userExist.role,
      branchId: userExist.branchId,
      customRole: userExist.customRole,
      position: userExist.position,
    });

    return {
      success: true,
      token,
      role: userExist.role,
      message: 'User login successfully',
    };
  }

  async loginTeacher(data: loginUserDto) {
    const teacherExist = await this.prisma.teacher.findFirst({
      where: { email: data.email },
    });
    if (!teacherExist) {
      throw new NotFoundException('teacher not found');
    }
    const isMatch = await bcrypt.compare(data.password, teacherExist.password);
    if (!isMatch) throw new BadRequestException('email or password incorrect');
    const token = this.jwtService.sign({
      id: teacherExist.id,
      role: Role.TEACHER,
      email: teacherExist.email,
      branchId: teacherExist.branchId,
    });

    return {
      success: true,
      token,
      role: Role.TEACHER,
      message: 'Teacher login successfully',
    };
  }

    async getMe(userFromToken: any) {
        const { id, role } = userFromToken;

        if (USER_ROLES.includes(role) || role === 'STAFF') {
            const user = await this.prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    fullName: true,
                    photo: true,
                    email: true,
                    phone: true,
                    status: true,
                    role: true,
                    branchId: true,
                    created_at: true,
                    updated_at: true,
                },
            });
            if (!user) throw new NotFoundException('User not found');
            return { success: true, data: user, role: user.role };
        }

        if (role === Role.STUDENT) {
            const student = await this.prisma.student.findUnique({
                where: { id },
                select: {
                    id: true,
                    fullName: true,
                    photo: true,
                    email: true,
                    phone: true,
                    status: true,
                    branchId: true,
                    created_at: true,
                    updated_at: true,
                    StudentGroups: {
                        select: {
                            group: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
            });
            if (!student) throw new NotFoundException('Student not found');
            return { success: true, data: student, role: Role.STUDENT };
        }

        if (role === Role.TEACHER) {
            const teacher = await this.prisma.teacher.findUnique({
                where: { id },
                select: {
                    id: true,
                    fullName: true,
                    photo: true,
                    status: true,
                    email: true,
                    phone: true,
                    branchId: true,
                    created_at: true,
                    updated_at: true,
                    groups: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            if (!teacher) throw new NotFoundException('Teacher not found');
            return { success: true, data: teacher, role: Role.TEACHER };
        }

        throw new NotFoundException('User not found');
    }
}

const USER_ROLES = [
    Role.SUPERADMIN,
    Role.ADMIN,
    Role.CREATOR,
];
