import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
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
    ) { }

    async loginStudent(data: loginUserDto) {
        const studentExist = await this.prisma.student.findUnique({
            where: { email: data.email },
        });
        if (!studentExist) {
            throw new NotFoundException('Student not found');
        }
        const isMatch = await bcrypt.compare(
            data.password,
            studentExist.password,
        );

        if (!isMatch) throw new BadRequestException('email or password incorrect');

        const token = await this.jwtService.sign({
            id: studentExist.id,
            role: Role.STUDENT,
            email: studentExist.email,
        });

        return {
            success: true,
            message: 'Student sign in successfully',
            token,
        };
    }

    async loginUser(data: loginUserDto) {
        const userExist = await this.prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!userExist) {
            throw new NotFoundException('user not found');
        }
        const isMatch = await bcrypt.compare(data.password, userExist.password);
        if (!isMatch)
            throw new BadRequestException('email or password incorrect');
        const token = this.jwtService.sign({
            id: userExist.id,
            email: userExist.email,
            role: userExist.role,
        });


        return {
            success: true,
            token,
            message: "User login successfully"
        };

    }

    async loginTeacher(data: loginUserDto) {

        const teacherExist = await this.prisma.teacher.findUnique({
            where: { email: data.email },
        });
        if (!teacherExist) {
            throw new NotFoundException('teacher not found');
        }
        const isMatch = await bcrypt.compare(
            data.password,
            teacherExist.password,
        );
        if (!isMatch)
            throw new BadRequestException('email or password incorrect');
        const token = this.jwtService.sign({
            id: teacherExist.id,
            role: Role.TEACHER,
            email: teacherExist.email,
        });

        return {
            success: true,
            token,
            message: "User login successfully"
        };
    }

    // async getDashboard(userFromToken, tableName: string) {
    //     if (userFromToken.roles && tableName == 'user') {
    //         return await this.prisma.user.findUnique({
    //             where: { id: userFromToken.id },
    //             select: {
    //                 fullName: true,
    //                 photo: true,
    //                 email: true,
    //                 phone: true,
    //                 status: true,
    //                 role: true,
    //                 branchId: true,
    //                 createdAt: true,
    //                 updatedAt: true,
    //             },
    //         });
    //     }
    //     const student = await this.prisma.student.findUnique({
    //         where: { id: userFromToken.id },
    //         select: {
    //             fullName: true,
    //             photo: true,
    //             email: true,
    //             phone: true,
    //             status: true,
    //             branchId: true,
    //             createdAt: true,
    //             updatedAt: true,
    //             studentGroups: {
    //                 select: {
    //                     group: {
    //                         select: {
    //                             id: true,
    //                             name: true,
    //                         },
    //                     },
    //                 },
    //             },
    //         },
    //     });
    //     const teacher = await this.prisma.teacher.findUnique({
    //         where: { id: userFromToken.id },
    //         select: {
    //             fullName: true,
    //             photo: true,
    //             status: true,
    //             email: true,
    //             phone: true,
    //             profession: true,
    //             branchId: true,
    //             createdAt: true,
    //             updatedAt: true,
    //             teacherGroups: {
    //                 select: {
    //                     group: {
    //                         select: {
    //                             id: true,
    //                             name: true,
    //                         },
    //                     },
    //                 },
    //             },
    //         },
    //     });

    //     if (student && tableName == 'student') {
    //         return {
    //             success: true,
    //             data: student,
    //         };
    //     }
    //     if (teacher && tableName == 'teacher') {
    //         return {
    //             success: true,
    //             data: teacher,
    //         };
    //     }

    //     throw new NotFoundException('User not found');
    // }
}
