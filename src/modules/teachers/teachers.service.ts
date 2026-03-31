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
import { Role, TeacherHistoryType, UserStatus } from '@prisma/client';

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
};

@Injectable()
export class TeachersService {
    constructor(
        private prisma: PrismaService,
        private mail: MailService,
        private jwt: JwtService,
    ) { }

    async create(dto: CreateTeacherDto, currentUser: { role: Role }, file?: Express.Multer.File) {
        const existing = await this.prisma.teacher.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Bu email allaqachon mavjud');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);


        const teacher = await this.prisma.teacher.create({
            data: {
                ...dto,
                addedBy: currentUser.role,
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
        const { page = 1, limit = 10, search, courseId } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            status: { not: 'DELETED' as const },
            ...(search && {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { position: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            // courseId bo'yicha — o'sha kursda guruhi bor teacherla
        };

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

        const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';

        return {
            success: true,
            data: teachers.map((t) => ({
                ...t,
                photo: t.photo ? `${baseUrl}/uploads/${t.photo}` : null,
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';

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
                ...teacher,
                avgRating,

                photo: teacher.photo ? `${baseUrl}/uploads/${teacher.photo}` : null,

            }
        };
    }

    async update(id: number, dto: UpdateTeacherDto, file?: Express.Multer.File) {
        await this.findOne(id);

        const dataToUpdate: any = { ...dto };

        if (dto.birth_date) {
            dataToUpdate.birth_date = new Date(dto.birth_date);
        }

        if (file) {
            dataToUpdate.photo = file.filename;
        }

        const teacher = await this.prisma.teacher.update({
            where: { id },
            data: dataToUpdate,
            select: SELECT_TEACHER,
        });

        return {
            success: true,
            message: "O'qituvchi ma'lumotlari yangilandi",
            data: teacher,
        };
    }

    async archive(id: number, currentUser: { id: number, role: Role }) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                fullName: true,
                groups: {
                    where: { status: 'ACTIVE' },
                    select: { id: true, name: true },
                },
            },
        });

        if (!teacher) {
            throw new NotFoundException(`ID: ${id} bo'yicha o'qituvchi topilmadi`);
        }

        if (teacher.status === 'INACTIVE') {
            throw new BadRequestException(`Bu o'qituvchi allaqachon arxivda`);
        }

        if (teacher.status === 'DELETED') {
            throw new BadRequestException(`Bu o'qituvchi o'chirilgan`);
        }

        // Aktiv guruhlari bor bo'lsa — xato
        if (teacher.groups.length > 0) {
            const groupNames = teacher.groups.map((g) => g.name).join(', ');
            throw new BadRequestException(
                `O'qituvchini arxivga o'tkazish uchun avval quyidagi guruhlardan olib tashlang: ${groupNames}`
            );
        }

        // Arxivga o'tkazish
        await this.prisma.teacher.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        // TeacherHistory ga saqlash
        await this.prisma.teacherHistory.create({
            data: {
                teacherId: id,
                userId: currentUser.id,
                type: TeacherHistoryType.ARCHIVED,
                description: `O'qituvchi (${teacher.fullName}) arxivga o'tkazildi`,
            },
        });

        return {
            success: true,
            message: `O'qituvchi arxivga o'tkazildi`,
        };
    }

    async remove(id: number, currentUser: { id: number, role: Role }) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id },
            select: { id: true, status: true, fullName: true },
        });

        if (!teacher) {
            throw new NotFoundException(`ID: ${id} bo'yicha o'qituvchi topilmadi`);
        }

        if (teacher.status === 'DELETED') {
            throw new BadRequestException(`Bu o'qituvchi allaqachon o'chirilgan`);
        }

        // DELETED qilish
        await this.prisma.teacher.update({
            where: { id },
            data: { status: 'DELETED' },
        });

        // TeacherHistory ga saqlash
        await this.prisma.teacherHistory.create({
            data: {
                teacherId: id,
                userId: currentUser.id,
                type: TeacherHistoryType.DELETED,
                description: `O'qituvchi (${teacher.fullName}) tizimdan o'chirildi`,
            },
        });

        return {
            success: true,
            message: `O'qituvchi o'chirildi`,
        };
    }

    async restore(id: number, currentUser: { id: number, role: Role }) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id },
            select: { id: true, status: true, fullName: true },
        });

        if (!teacher) {
            throw new NotFoundException(`ID: ${id} bo'yicha o'qituvchi topilmadi`);
        }

        if (teacher.status !== 'INACTIVE') {
            throw new BadRequestException(`Bu o'qituvchi arxivda emas`);
        }

        await this.prisma.teacher.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });

        await this.prisma.teacherHistory.create({
            data: {
                teacherId: id,
                userId: currentUser.id,
                type: 'RESTORED',
                description: `O'qituvchi (${teacher.fullName}) arxivdan qayta faollashtirildi`,
            },
        });

        return {
            success: true,
            message: `O'qituvchi faollashtirildi`,
        };
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
