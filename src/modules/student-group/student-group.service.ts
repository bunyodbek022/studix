import PrismaService from "src/prisma/prisma.service";
import { CreateStudentGroupDto } from "./dto/create-student-group.dto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FindAllStudentGroupDto } from "./dto/find-all-student-group.dto";
import { UpdateStudentGroupDto } from "./dto/update-student-group.dto";

@Injectable()
export class StudentGroupService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateStudentGroupDto, currentUser: {id: number}) {
        const group = await this.prisma.group.findUnique({
            where: { id: dto.groupId },
            include: { room: true },
        });
        if (!group) {
            throw new NotFoundException(`Guruh topilmadi: ${dto.groupId}`);
        }

        const student = await this.prisma.student.findUnique({
            where: { id: dto.studentId },
        });
        if (!student) {
            throw new NotFoundException(`Student topilmadi: ${dto.studentId}`);
        }

        const existing = await this.prisma.studentGroup.findUnique({
            where: {
                groupId_studentId: {
                    groupId: dto.groupId,
                    studentId: dto.studentId,
                },
            },
        });

        if (existing) {
            if (existing.status === 'INACTIVE') {
                const reactivated = await this.prisma.studentGroup.update({
                    where: { id: existing.id },
                    data: { status: 'ACTIVE' },
                });
                return {
                    success: true,
                    message: 'Student guruhga qayta qo\'shildi',
                    data: reactivated,
                };
            }
            throw new ConflictException('Bu student allaqachon ushbu guruhda mavjud');
        }

        const currentCount = await this.prisma.studentGroup.count({
            where: { groupId: dto.groupId, status: 'ACTIVE' },
        });
        if (currentCount >= group.room.capacity) {
            throw new BadRequestException('Guruh to\'liq, joy mavjud emas');
        }

        const studentGroup = await this.prisma.studentGroup.create({
            data: {
                groupId: dto.groupId,
                studentId: dto.studentId,
                userId: currentUser.id,
            },
            include: {
                student: {
                    select: { id: true, fullName: true, email: true, photo: true },
                },
                group: {
                    select: { id: true, name: true },
                },
            },
        });

        return {
            success: true,
            message: 'Student guruhga muvaffaqiyatli qo\'shildi',
            data: studentGroup,
        };
    }

    async findAll(query: FindAllStudentGroupDto) {
        const { page = 1, limit = 10, search, groupId } = query;
        const skip = (page - 1) * limit;

        const where = {
            ...(groupId && { groupId }),
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
                            status: true,
                        },
                    },
                    group: {
                        select: {
                            id: true,
                            name: true,
                            course: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.studentGroup.count({ where }),
        ]);

        return {
            success: true,
            data: studentGroups,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const studentGroup = await this.prisma.studentGroup.findUnique({
            where: { id },
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
                group: {
                    include: {
                        course: { select: { id: true, name: true, level: true } },
                        teacher: { select: { id: true, fullName: true, photo: true } },
                        room: { select: { id: true, name: true, capacity: true } },
                    },
                },
            },
        });

        if (!studentGroup) {
            throw new NotFoundException(`Student-guruh yozuvi topilmadi: ${id}`);
        }

        return { success: true, data: studentGroup };
    }

    async update(id: number, dto: UpdateStudentGroupDto) {
        const studentGroup = await this.prisma.studentGroup.findUnique({
            where: { id },
        });

        if (!studentGroup) {
            throw new NotFoundException(`Student-guruh yozuvi topilmadi: ${id}`);
        }

        const updated = await this.prisma.studentGroup.update({
            where: { id },
            data: { status: dto.status },
        });

        return {
            success: true,
            message: 'Status muvaffaqiyatli yangilandi',
            data: updated,
        };
    }

    async remove(id: number) {
        const studentGroup = await this.prisma.studentGroup.findUnique({
            where: { id },
        });

        if (!studentGroup) {
            throw new NotFoundException(`Student-guruh yozuvi topilmadi: ${id}`);
        }

        if (studentGroup.status === 'INACTIVE') {
            throw new BadRequestException('Bu yozuv allaqachon INACTIVE');
        }

        const removed = await this.prisma.studentGroup.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        return {
            success: true,
            message: 'Student guruhdan chiqarildi',
            data: removed,
        };
    }
}