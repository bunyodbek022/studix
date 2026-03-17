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
import { UpdateGroupDto } from './dto/update-group.dto';

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
            where: { status: { not: 'DELETED' as const } },
            include: {
                course: {
                    select: { id: true, name: true },
                },
                teacher: {
                    select: { id: true, fullName: true },
                },
                room: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { created_at: 'desc' },
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
            status: Status.ACTIVE,
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


    async getSchedule(id: number) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                course: { select: { durationMonth: true, durationLesson: true } },
                lesson: {
                    select: { id: true, title: true, created_at: true },
                    orderBy: { created_at: 'asc' },
                },
            },
        });

        if (!group) {
            throw new NotFoundException(`Guruh topilmadi: ${id}`);
        }

        const WEEK_DAY_MAP: Record<string, number> = {
            SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
            THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
        };

        const startDate = new Date(group.startDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + group.course.durationMonth);

        const scheduleDays: {
            date: string;
            dayLabel: string;
            monthLabel: string;
            isWeekend: boolean;
            lesson: { id: number; title: string } | null;
        }[] = [];

        const lessonDateMap = new Map<string, { id: number; title: string }>();
        for (const lesson of group.lesson) {
            const dateKey = new Date(lesson.created_at).toISOString().split('T')[0];
            lessonDateMap.set(dateKey, { id: lesson.id, title: lesson.title });
        }

        const current = new Date(startDate);
        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            const isClassDay = group.weekDays.some(
                (day) => WEEK_DAY_MAP[day] === dayOfWeek,
            );

            if (isClassDay) {
                const dateKey = current.toISOString().split('T')[0];
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                scheduleDays.push({
                    date: dateKey,
                    dayLabel: current.getDate().toString().padStart(2, '0'),
                    monthLabel: current.toLocaleString('uz-UZ', { month: 'short' }),
                    isWeekend,
                    lesson: lessonDateMap.get(dateKey) || null,
                });
            }

            current.setDate(current.getDate() + 1);
        }

        return {
            success: true,
            data: {
                groupId: group.id,
                groupName: group.name,
                startTime: group.startTime,
                durationLesson: group.course.durationLesson,
                scheduleDays,
            },
        };
    }

    async createGroup(payload: CreateGroupDto, currentUser: { id: number }) {
        const existTeacher = await this.prisma.teacher.findFirst({
            where: { id: payload.teacherId, status: Status.ACTIVE },
        });
        if (!existTeacher) {
            throw new NotFoundException('Teacher not found with this id');
        }

        const existCourse = await this.prisma.course.findFirst({
            where: { id: payload.courseId, status: Status.ACTIVE },
            select: { durationLesson: true },
        });
        if (!existCourse) {
            throw new NotFoundException('Course not found with this id');
        }

        const existRoom = await this.prisma.room.findFirst({
            where: { id: payload.roomId, status: Status.ACTIVE },
        });
        if (!existRoom) {
            throw new NotFoundException('Room not found with this id');
        }

        const existGroup = await this.prisma.group.findUnique({
            where: { courseId_name: { name: payload.name, courseId: payload.courseId } },
        });
        if (existGroup) {
            throw new ConflictException('Group already exist with this course');
        }

        function timeToMinutes(time: string): number {
            const [hour, minute] = time.split(':').map(Number);
            return hour * 60 + minute;
        }

        // Xona band kunlarini tekshirish
        const roomGroups = await this.prisma.group.findMany({
            where: { roomId: payload.roomId, status: Status.ACTIVE },
            select: {
                startTime: true,
                weekDays: true,
                course: { select: { durationLesson: true } },
            },
        });

        const newStartMinute = timeToMinutes(payload.startTime);
        const newEndMinute = newStartMinute + existCourse.durationLesson;

        for (const roomGroup of roomGroups) {
            // Umumiy kun bor-yo'qligini tekshirish
            const hasCommonDay = roomGroup.weekDays.some((day) =>
                payload.weekDays.includes(day),
            );

            if (!hasCommonDay) continue; // Kun mos kelmasa — muammo yo'q

            // Vaqt to'qnashuvi tekshirish
            const startMinute = timeToMinutes(roomGroup.startTime);
            const endMinute = startMinute + roomGroup.course.durationLesson;

            const isOverlap = newStartMinute < endMinute && newEndMinute > startMinute;

            if (isOverlap) {
                throw new BadRequestException(
                    `Bu xona ${roomGroup.weekDays.join(', ')} kunlari ${roomGroup.startTime} da band`,
                );
            }
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

    async updateGroup(id: number, payload: UpdateGroupDto) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                courseId: true,
                teacherId: true,
                roomId: true,
                startTime: true,
                weekDays: true,
                status: true,
            },
        });

        if (!group) {
            throw new NotFoundException(`ID: ${id} bo'yicha guruh topilmadi`);
        }

        // Yangi qiymatlar yoki mavjud qiymatlar
        const teacherId = payload.teacherId ?? group.teacherId;
        const courseId = payload.courseId ?? group.courseId;
        const roomId = payload.roomId ?? group.roomId;
        const startTime = payload.startTime ?? group.startTime;
        const weekDays = payload.weekDays ?? group.weekDays;
        const name = payload.name ?? group.name;

        function timeToMinutes(time: string): number {
            const [hour, minute] = time.split(':').map(Number);
            return hour * 60 + minute;
        }

        // Teacher tekshirish
        if (payload.teacherId) {
            const existTeacher = await this.prisma.teacher.findFirst({
                where: { id: teacherId, status: Status.ACTIVE },
            });
            if (!existTeacher) {
                throw new NotFoundException('Teacher not found with this id');
            }
        }

        // Course tekshirish
        const existCourse = await this.prisma.course.findFirst({
            where: { id: courseId, status: Status.ACTIVE },
            select: { durationLesson: true },
        });
        if (!existCourse) {
            throw new NotFoundException('Course not found with this id');
        }

        // Room tekshirish
        if (payload.roomId) {
            const existRoom = await this.prisma.room.findFirst({
                where: { id: roomId, status: Status.ACTIVE },
            });
            if (!existRoom) {
                throw new NotFoundException('Room not found with this id');
            }
        }

        // Guruh nomi unique tekshirish (o'zi bundan mustasno)
        if (payload.name && payload.name !== group.name) {
            const existGroup = await this.prisma.group.findUnique({
                where: {
                    courseId_name: { name, courseId },
                },
            });
            if (existGroup) {
                throw new ConflictException('Group already exist with this course');
            }
        }

        // Xona band kunlarini tekshirish (o'zi bundan mustasno)
        if (payload.roomId || payload.startTime || payload.weekDays) {
            const roomGroups = await this.prisma.group.findMany({
                where: {
                    roomId,
                    status: Status.ACTIVE,
                    id: { not: id }, // o'zini olib tashlash
                },
                select: {
                    startTime: true,
                    weekDays: true,
                    course: { select: { durationLesson: true } },
                },
            });

            const newStartMinute = timeToMinutes(startTime);
            const newEndMinute = newStartMinute + existCourse.durationLesson;

            for (const roomGroup of roomGroups) {
                const hasCommonDay = roomGroup.weekDays.some((day) =>
                    weekDays.includes(day),
                );

                if (!hasCommonDay) continue;

                const startMinute = timeToMinutes(roomGroup.startTime);
                const endMinute = startMinute + roomGroup.course.durationLesson;

                const isOverlap = newStartMinute < endMinute && newEndMinute > startMinute;

                if (isOverlap) {
                    throw new BadRequestException(
                        `Bu xona ${roomGroup.weekDays.join(', ')} kunlari ${roomGroup.startTime} da band`,
                    );
                }
            }
        }

        const updated = await this.prisma.group.update({
            where: { id },
            data: {
                ...payload,
                startDate: payload.startDate ? new Date(payload.startDate) : undefined,
            },
        });

        return {
            success: true,
            message: 'Guruh yangilandi',
            data: updated,
        };
    }

    async archive(id: number) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            select: { id: true, status: true, name: true },
        });

        if (!group) {
            throw new NotFoundException(`ID: ${id} bo'yicha guruh topilmadi`);
        }

        if (group.status === 'INACTIVE') {
            throw new BadRequestException('Bu guruh allaqachon arxivda');
        }

        await this.prisma.group.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        await this.prisma.groupHistory.create({
            data: {
                groupId: id,
                type: 'ARCHIVED',
                description: `Guruh (${group.name}) arxivga o'tkazildi`,
            },
        });

        return {
            success: true,
            message: `Guruh arxivga o'tkazildi`,
        };
    }

    async restore(id: number) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            select: { id: true, status: true, name: true },
        });

        if (!group) {
            throw new NotFoundException(`ID: ${id} bo'yicha guruh topilmadi`);
        }

        if (group.status !== 'INACTIVE') {
            throw new BadRequestException('Bu guruh arxivda emas');
        }

        await this.prisma.group.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });

        await this.prisma.groupHistory.create({
            data: {
                groupId: id,
                type: 'RESTORED',
                description: `Guruh (${group.name}) arxivdan qayta faollashtirildi`,
            },
        });

        return {
            success: true,
            message: 'Guruh faollashtirildi',
        };
    }

    async remove(id: number) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            select: { id: true, status: true, name: true },
        });

        if (!group) {
            throw new NotFoundException(`ID: ${id} bo'yicha guruh topilmadi`);
        }

        if (group.status === 'DELETED') {
            throw new BadRequestException('Bu guruh allaqachon o\'chirilgan');
        }

        // StudentGroup larni o'chirish
        await this.prisma.studentGroup.updateMany({
            where: { groupId: id },
            data: {
                status: Status.DELETED
            }
        });

        // DELETED qilish
        await this.prisma.group.update({
            where: { id },
            data: { status: 'DELETED' },
        });

        // Tarixga saqlash
        await this.prisma.groupHistory.create({
            data: {
                groupId: id,
                type: 'DELETED',
                description: `Guruh (${group.name}) tizimdan o'chirildi`,
            },
        });

        return {
            success: true,
            message: 'Guruh o\'chirildi',
        };
    }
}
