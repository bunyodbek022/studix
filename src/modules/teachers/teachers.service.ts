import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/common/mail/mail.service';
import PrismaService from 'src/prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtService } from '@nestjs/jwt';
import { FindAllTeachersDto } from './dto/find-all-teachers.dto';

const SELECT_TEACHER = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    birth_date: true,
    addedBy: true,
    photo: true,
    position: true,
    experience: true,
    status: true,
    created_at: true,
    updated_at: true,
    groups: {
        select: {
            name: true,
        },
        take: 1, // Get at least one group to show in the UI list if needed
    }
};

@Injectable()
export class TeachersService {
    constructor(
        private prisma: PrismaService,
        private mail: MailService,
        private jwt: JwtService,
    ) { }

    async create(dto: CreateTeacherDto, userId: number, file?: Express.Multer.File) {
        const existing = await this.prisma.teacher.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Bu email allaqachon mavjud');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        let addedByFullName: string | null = null;
        if (userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { fullName: true }
            });
            if (user) {
                addedByFullName = user.fullName;
            }
        }

        const teacher = await this.prisma.teacher.create({
            data: {
                ...dto,
                addedBy: addedByFullName,
                password: hashedPassword,
                photo: file ? file.filename : null,
                birth_date: dto.birth_date ? new Date(dto.birth_date) : null,
            },
            select: SELECT_TEACHER,
        });

        return {
            success: true,
            data: teacher,
        };
    }

    async findAll(query: FindAllTeachersDto) {
        const { page = 1, limit = 10, search } = query;
        const skip = (page - 1) * limit;

        const where = search
            ? {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { position: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [teachers, total] = await this.prisma.$transaction([
            this.prisma.teacher.findMany({
                where,
                select: SELECT_TEACHER,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.teacher.count({ where }),
        ]);

        return {
            success: true,
            data: teachers,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id },
            select: {
                ...SELECT_TEACHER,
                groups: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        startDate: true,
                        startTime: true,
                        weekDays: true,
                        course: { select: { id: true, name: true } },
                        room: { select: { id: true, name: true } },
                    },
                },
                rating: {
                    select: {
                        id: true,
                        score: true,
                        created_at: true,
                    },
                },
            },
        });

        if (!teacher) {
            throw new NotFoundException(`ID: ${id} bo'yicha o'qituvchi topilmadi`);
        }

        const avgRating =
            teacher.rating.length > 0
                ? teacher.rating.reduce((sum, r) => sum + r.score, 0) /
                teacher.rating.length
                : null;

        return {
            sucess: true,
            data: {
                ...teacher, avgRating
            }
        };
    }

    async update(id: number, dto: UpdateTeacherDto) {
        await this.findOne(id);

        const dataToUpdate: any = { ...dto };
        if (dto.birth_date) {
            dataToUpdate.birth_date = new Date(dto.birth_date);
        }

        const teacher = await this.prisma.teacher.update({
            where: { id },
            data: dataToUpdate,
            select: SELECT_TEACHER,
        });

        return { message: "O'qituvchi ma'lumotlari yangilandi", teacher };
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.prisma.teacher.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        return { message: `O'qituvchi (ID: ${id}) o'chirildi` };
    }

    async getGroups(id: number) {
        await this.findOne(id);

        return this.prisma.group.findMany({
            where: { teacherId: id },
            select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                startTime: true,
                weekDays: true,
                course: { select: { id: true, name: true, level: true } },
                room: { select: { id: true, name: true } },
                _count: { select: { studentGroup: true, lesson: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async updatePhoto(id: number, filename: string) {
        await this.findOne(id);

        const teacher = await this.prisma.teacher.update({
            where: { id },
            data: { photo: filename },
            select: { id: true, fullName: true, photo: true },
        });

        const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
        return {
            message: 'Rasm muvaffaqiyatli yuklandi',
            photo: `${baseUrl}/uploads/${filename}`,
            teacher,
        };
    }
}
