import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/common/mail/mail.service';
import PrismaService from 'src/prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const SELECT_STUDENT = {
    id: true,
    fullName: true,
    email: true,
    photo: true,
    birth_date: true,
    status: true,
    created_at: true,
    updated_at: true,
};

@Injectable()
export class StudentsService {
    constructor(
        private prisma: PrismaService,
        private mail: MailService,
    ) { }

    private buildPhotoUrl(filename?: string) {
        if (!filename) return null;
        const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
        return `${baseUrl}/uploads/${filename}`;
    }

    async create(dto: CreateStudentDto, file?: Express.Multer.File) {
        const exists = await this.prisma.student.findUnique({
            where: { email: dto.email },
        });

        if (exists) {
            throw new BadRequestException("Bu email allaqachon ro'yxatdan o'tgan");
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const student = await this.prisma.student.create({
            data: {
                fullName: dto.fullName,
                email: dto.email,
                birth_date: new Date(dto.birth_date),
                password: hashedPassword,
                photo: this.buildPhotoUrl(file?.filename),
            },
            select: SELECT_STUDENT,
        });

        await this.mail.sendCredentials(dto.email, dto.fullName, dto.password);

        return {
            success: true,
            message: `O'quvchi qo'shildi. Login va parol ${dto.email} manziliga yuborildi.`,
            student,
        };
    }

    async findAll() {
        const students = await this.prisma.student.findMany({
            select: SELECT_STUDENT,
            orderBy: { created_at: 'desc' },
        });

        return {
            success: true,
            data: students,
        };
    }

    async findOne(id: number) {
        const student = await this.prisma.student.findUnique({
            where: { id },
            select: {
                ...SELECT_STUDENT,
                StudentGroups: {
                    select: {
                        status: true,
                        group: {
                            select: {
                                id: true,
                                name: true,
                                status: true,
                                startDate: true,
                                startTime: true,
                                weekDays: true,
                                course: { select: { id: true, name: true, level: true } },
                                teacher: { select: { id: true, fullName: true } },
                                room: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!student) {
            throw new NotFoundException(`ID: ${id} bo'yicha o'quvchi topilmadi`);
        }

        return {
            success: true,
            data: student,
        };
    }

    async getGroups(id: number) {
        await this.findOne(id);

        const groups = await this.prisma.studentGroup.findMany({
            where: { studentId: id },
            select: {
                id: true,
                status: true,
                group: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        startDate: true,
                        startTime: true,
                        weekDays: true,
                        course: { select: { id: true, name: true, level: true } },
                        teacher: { select: { id: true, fullName: true } },
                        room: { select: { id: true, name: true } },
                    },
                },
            },
        });

        return {
            success: true,
            data: groups,
        };
    }

    async getGroupSummary(studentId: number) {
        const studentGroups = await this.prisma.studentGroup.findMany({
            where: {
                studentId,
                status: 'ACTIVE',
            },
            include: {
                group: {
                    include: {
                        course: true,
                        teacher: true,
                        lesson: {
                            include: {
                                lesson: {
                                    // Attendance
                                    where: {
                                        studentId,
                                        isPresent: false,
                                    },
                                },
                                lessonHomework: true,
                            },
                        },
                    },
                },
            },
        });

        if (!studentGroups.length) {
            throw new NotFoundException(`Student with id ${studentId} has no groups`);
        }

        const data = studentGroups.map((sg) => {
            const group = sg.group;
            const lessons = group.lesson;

            const attendanceMissedCount = lessons.reduce(
                (acc, lesson) => acc + lesson.lesson.length,
                0,
            );


            const homeworkCount = lessons.reduce(
                (acc, lesson) => acc + lesson.lessonHomework.length,
                0,
            );

            const lessonCount = lessons.length;

            return {
                groupId: group.id,
                groupName: group.name,
                courseId: group.course.id,
                courseName: group.course.name,
                teacherName: group.teacher.fullName,
                attendanceMissedCount,
                homeworkCount,
                lessonCount,
            };
        });

        return { success: true, data };
    }

    async getAttendanceDetails(studentId: number, groupId: number) {
        const studentGroup = await this.prisma.studentGroup.findUnique({
            where: {
                groupId_studentId: { groupId, studentId },
            },
            include: {
                group: {
                    include: {
                        course: true,
                    },
                },
            },
        });

        if (!studentGroup) {
            throw new NotFoundException(
                `Student ${studentId} does not belong to group ${groupId}`,
            );
        }

        const attendances = await this.prisma.attendance.findMany({
            where: {
                studentId,
                lesson: { groupId },
                isPresent: false,
            },
            include: {
                lesson: true,
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        const items = attendances.map((a) => ({
            attendanceId: a.id,
            lessonId: a.lessonId,
            date: a.created_at.toISOString().split('T')[0],
            courseName: studentGroup.group.course.name,
            topicTitle: a.lesson.title,
            isPresent: a.isPresent,
        }));

        return {
            success: true,
            data: {
                summary: {
                    studentId,
                    groupId,
                    groupName: studentGroup.group.name,
                    courseName: studentGroup.group.course.name,
                    missedCount: items.length,
                },
                items,
            },
        };
    }

    async getHomeworks(studentId: number, groupId: number) {
        const studentGroup = await this.prisma.studentGroup.findUnique({
            where: {
                groupId_studentId: { groupId, studentId },
            },
        });

        if (!studentGroup) {
            throw new NotFoundException(
                `Student ${studentId} does not belong to group ${groupId}`,
            );
        }

        const homeworks = await this.prisma.homework.findMany({
            where: {
                lesson: { groupId },
            },
            include: {
                lesson: true,
                homeworkResponse: {
                    where: { studentId },
                    take: 1,
                },
                homeworkResult: {
                    where: { studentId },
                    take: 1,
                },
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        const data = homeworks.map((hw) => {
            const response = hw.homeworkResponse[0] ?? null;
            const result = hw.homeworkResult[0] ?? null;

            return {
                homeworkId: hw.id,
                title: hw.title,
                lessonTitle: hw.lesson.title,
                createdAt: hw.created_at,
                durationTime: hw.durationTime,
                studentResponseStatus: response?.status ?? null,
                teacherResultStatus: result?.status ?? null,
                score: result?.score ?? null,
            };
        });

        return { success: true, data };
    }

    async update(id: number, dto: UpdateStudentDto, file?: Express.Multer.File) {
        await this.findOne(id);

        const data: any = {};

        if (dto.fullName !== undefined) data.fullName = dto.fullName;
        if (dto.email !== undefined) data.email = dto.email;
        if (dto.birth_date !== undefined) {
            data.birth_date = new Date(dto.birth_date);
        }

        if (dto.password) {
            data.password = await bcrypt.hash(dto.password, 10);
        }

        if (file?.filename) {
            data.photo = this.buildPhotoUrl(file.filename);
        }

        const student = await this.prisma.student.update({
            where: { id },
            data,
            select: SELECT_STUDENT,
        });

        return {
            success: true,
            message: "O'quvchi ma'lumotlari yangilandi",
            student,
        };
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.prisma.student.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        return {
            success: true,
            message: `O'quvchi (ID: ${id}) o'chirildi`,
        };
    }

}