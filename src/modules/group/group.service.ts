import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { Role, Status, WeekDays } from '@prisma/client';
import PrismaService from 'src/prisma/prisma.service';
import { PaginationSearchDto } from './dto/pagination-search.dto';

@Injectable()
export class GroupsService {
    constructor(private prisma: PrismaService) { }

    async getGroupLessons(
        groupId: number,
        currentUser: { id: number; role: Role },
    ) {
        const existGroup = await this.prisma.group.findUnique({
            where: {
                id: groupId,
                status: 'ACTIVE',
            },
        });

        if (!existGroup) {
            throw new NotFoundException('Group not found');
        }

        if (
            currentUser.role == 'TEACHER' &&
            existGroup.teacherId != currentUser.id
        ) {
            throw new ForbiddenException('Bu sening guruhing emas');
        }

        const lessons = await this.prisma.lesson.findMany({
            where: {
                groupId,
            },
        });

        return {
            success: true,
            data: lessons,
        };
    }

    async getAllGroup() {
        const groups = await this.prisma.group.findMany({
            where: { status: 'ACTIVE' },
        });

        return {
            success: true,
            data: groups,
        };
    }

    async findOne(id: number) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                course: true,
                teacher: {
                    select: {
                        id: true,
                        fullName: true,
                        photo: true,
                        position: true,
                        experience: true,
                    },
                },
                room: true,
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        position: true,
                    },
                },
                _count: {
                    select: {
                        studentGroup: true,
                        lesson: true,
                    },
                },
            },
        });

        if (!group) {
            throw new NotFoundException(`Guruh topilmadi: ${id}`);
        }

        return {
            success: true,
            data: {
                id: group.id,
                name: group.name,
                startDate: group.startDate,
                startTime: group.startTime,
                weekDays: group.weekDays,
                status: group.status,
                course: {
                    id: group.course.id,
                    name: group.course.name,
                    level: group.course.level,
                    durationMonth: group.course.durationMonth,
                    durationLesson: group.course.durationLesson,
                    price: group.course.price,
                },
                teacher: group.teacher,
                room: {
                    id: group.room.id,
                    name: group.room.name,
                    capacity: group.room.capacity,
                },
                responsibleUser: group.user,
                studentCount: group._count.studentGroup,
                lessonCount: group._count.lesson,
            },
        };
    }

    async getStudents(id: number, query: PaginationSearchDto) {
        const { page = 1, limit = 10, search } = query;
        const skip = (page - 1) * limit;

        const group = await this.prisma.group.findUnique({ where: { id } });
        if (!group) {
            throw new NotFoundException(`Guruh topilmadi: ${id}`);
        }

        const where = {
            groupId: id,
            ...(search && {
                student: {
                    fullName: { contains: search, mode: 'insensitive' as const },
                },
            }),
        };

        const [studentGroups, total] = await this.prisma.$transaction([
            this.prisma.studentGroup.findMany({
                where,
                include: {
                    student: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            photo: true,
                            birth_date: true,
                            status: true,
                        },
                    },
                },
                orderBy: { created_at: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.studentGroup.count({ where }),
        ]);

        const data = studentGroups.map((sg) => ({
            studentGroupId: sg.id,
            status: sg.status,
            joinedAt: sg.created_at,
            student: sg.student,
        }));

        return {
            success: true,
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getLessons(id: number, query: PaginationSearchDto) {
        const { page = 1, limit = 10, search } = query;
        const skip = (page - 1) * limit;

        const group = await this.prisma.group.findUnique({ where: { id } });
        if (!group) {
            throw new NotFoundException(`Guruh topilmadi: ${id}`);
        }

        const where = {
            groupId: id,
            ...(search && {
                title: { contains: search, mode: 'insensitive' as const },
            }),
        };

        const [lessons, total] = await this.prisma.$transaction([
            this.prisma.lesson.findMany({
                where,
                include: {
                    teacher: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                    _count: {
                        select: {
                            lessonHomework: true,
                            lesson: true,
                            lessonVideo: true,
                        },
                    },
                },
                orderBy: { created_at: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.lesson.count({ where }),
        ]);

        // orderNumber uchun skip ni hisobga olamiz
        const data = lessons.map((l, index) => ({
            lessonId: l.id,
            orderNumber: skip + index + 1,
            title: l.title,
            createdAt: l.created_at,
            teacher: l.teacher ?? null,
            homeworkCount: l._count.lessonHomework,
            attendanceCount: l._count.lesson,
            videoCount: l._count.lessonVideo,
        }));

        return {
            success: true,
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async createGroup(payload: CreateGroupDto, currentUser: { id: number }) {
        const existTeacher = await this.prisma.teacher.findFirst({
            where: {
                id: payload.teacherId,
                status: Status.ACTIVE,
            },
        });

        if (!existTeacher) {
            throw new NotFoundException('Teacher not found with this id');
        }

        const existCourse = await this.prisma.course.findFirst({
            where: {
                id: payload.courseId,
                status: Status.ACTIVE,
            },
            select: {
                durationLesson: true,
            },
        });

        if (!existCourse) {
            throw new NotFoundException('Course not found with this id');
        }

        const existRoom = await this.prisma.room.findFirst({
            where: {
                id: payload.roomId,
                status: Status.ACTIVE,
            },
        });

        if (!existRoom) {
            throw new NotFoundException('Room not found with this id');
        }

        const existGroup = await this.prisma.group.findUnique({
            where: {
                name: payload.name,
                courseId: payload.courseId,
            },
        });
        if (existGroup) {
            throw new ConflictException('Group already exist with this course');
        }

        function timeToMinutes(time: string): number {
            const [hour, minute] = time.split(':').map(Number);
            return hour * 60 + minute;
        }

        const roomGroups = await this.prisma.group.findMany({
            where: {
                roomId: payload.roomId,
                status: Status.ACTIVE,
            },
            select: {
                startTime: true,
                weekDays: true,
                course: {
                    select: {
                        durationLesson: true,
                    },
                },
            },
        });

        let newStartMinute = timeToMinutes(payload.startTime);
        let newEndMinute =
            timeToMinutes(payload.startTime) + existCourse.durationLesson;
        const roomBusy = roomGroups.every((roomGroup) => {
            const { startTime } = roomGroup;
            let startMinute = timeToMinutes(startTime);
            let endMinute =
                timeToMinutes(startTime) + roomGroup.course.durationLesson;

            return startMinute >= newEndMinute || endMinute <= newStartMinute;
        });

        if (!roomBusy) {
            throw new BadRequestException('Bu vaqtga hona band');
        }

        await this.prisma.group.create({
            data: {
                ...payload,
                userId: currentUser.id,
                startDate: new Date(payload.startDate),
            },
        });

        return {
            success: true,
            message: 'Group created',
        };
    }
}
