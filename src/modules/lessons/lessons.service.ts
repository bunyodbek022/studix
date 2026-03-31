import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Role, Status } from '@prisma/client';
import { SaveAttendanceDto } from './dto/save-attendance.dto';

@Injectable()
export class LessonsService {
    constructor(private prisma: PrismaService) { }

    async createLesson(payload: CreateLessonDto, currentUser: { id: number, role: Role }) {
        const existGroup = await this.prisma.group.findUnique({
            where: { id: payload.groupId, status: Status.ACTIVE },

        })

        if (!existGroup) {
            throw new NotFoundException("Group not found with this id")
        }

        await this.prisma.lesson.create({
            data: {
                ...payload,
                teacherId: currentUser.role == Role.TEACHER ? currentUser.id : null,
                userId: currentUser.role != Role.TEACHER ? currentUser.id : null
            }
        })
        return {
            success: true,
            message: "lesson created successfully"
        }
    }

    async saveAttendance(
        lessonId: number,
        dto: SaveAttendanceDto,
        currentUser: { id: number },
    ) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { id: true, groupId: true },
        });

        if (!lesson) {
            throw new NotFoundException(`Dars topilmadi: ${lessonId}`);
        }

        // Guruhda o'qiyotgan studentlar
        const studentGroups = await this.prisma.studentGroup.findMany({
            where: {
                groupId: lesson.groupId,
                status: 'ACTIVE',
            },
            select: { studentId: true },
        });

        const validStudentIds = new Set(studentGroups.map((sg) => sg.studentId));

        // Noto'g'ri studentId tekshirish
        const invalidIds = dto.items.filter((item) => !validStudentIds.has(item.studentId));
        if (invalidIds.length > 0) {
            throw new BadRequestException(
                `Bu guruhda bo'lmagan studentlar: ${invalidIds.map((i) => i.studentId).join(', ')}`,
            );
        }

        // Upsert — bor bo'lsa update, yo'q bo'lsa create
        await this.prisma.$transaction(
            dto.items.map((item) =>
                this.prisma.attendance.upsert({
                    where: {
                        // Unique constraint kerak — schema ga qo'shamiz
                        lessonId_studentId: {
                            lessonId,
                            studentId: item.studentId,
                        },
                    },
                    update: {
                        isPresent: item.isPresent,
                        userId: currentUser.id,
                    },
                    create: {
                        lessonId,
                        studentId: item.studentId,
                        isPresent: item.isPresent,
                        userId: currentUser.id,
                    },
                }),
            ),
        );

        return {
            success: true,
            message: 'Davomat saqlandi',
        };
    }

    async getAttendance(lessonId: number) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { id: true, groupId: true },
        });

        if (!lesson) {
            throw new NotFoundException(`Dars topilmadi: ${lessonId}`);
        }

        const attendances = await this.prisma.attendance.findMany({
            where: { lessonId },
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        photo: true,
                    },
                },
            },
            orderBy: { created_at: 'asc' },
        });

        return {
            success: true,
            data: attendances.map((a) => ({
                id: a.id,
                studentId: a.studentId,
                isPresent: a.isPresent,
                student: a.student,
            })),
        };
    }


    async findOne(id: number) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id },
            include: {
                lessonVideo: true,
                group: true,
            }
        });

        if (!lesson) {
            throw new NotFoundException("Lesson not found");
        }

        return {
            success: true,
            data: lesson
        };
    }

    async update(id: number, dto: UpdateLessonDto) {
        const existLesson = await this.prisma.lesson.findUnique({ where: { id } });
        if (!existLesson) {
            throw new NotFoundException("Lesson not found");
        }

        const updatedLesson = await this.prisma.lesson.update({
            where: { id },
            data: { ...dto }
        });

        return {
            success: true,
            message: "Lesson updated successfully",
            data: updatedLesson
        };
    }

    async remove(id: number) {
        const existLesson = await this.prisma.lesson.findUnique({ where: { id } });
        if (!existLesson) {
            throw new NotFoundException("Lesson not found");
        }

        await this.prisma.$transaction([
            this.prisma.attendance.deleteMany({
                where: { lessonId: id },
            }),
            this.prisma.lesson.delete({
                where: { id },
            }),
        ]);

        return {
            success: true,
            message: "Lesson deleted successfully"
        };
    }
}
