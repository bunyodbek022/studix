import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FindAllCoursesDto } from './dto/find-all-courses.dto';

@Injectable()
export class CourseService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateCourseDto) {
        const existing = await this.prisma.course.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Bu nomdagi kurs allaqachon mavjud');
        }

        const course = await this.prisma.course.create({
            data: {
                ...dto,
                price: dto.price,
            },
        });

        return {
            success: true,
            message: 'Kurs muvaffaqiyatli yaratildi',
            data: course,
        };
    }

    async findAll(query: FindAllCoursesDto) {
        const { page = 1, limit = 10, search, status } = query;
        const skip = (page - 1) * limit;

        const where = {
            ...(status ? { status } : { status: 'ACTIVE' as const }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [courses, total] = await this.prisma.$transaction([
            this.prisma.course.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.course.count({ where }),
        ]);

        return {
            success: true,
            data: courses,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const course = await this.prisma.course.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { groups: true },
                },
            },
        });

        if (!course) {
            throw new NotFoundException(`ID: ${id} bo'yicha kurs topilmadi`);
        }

        return {
            success: true,
            data: {
                ...course,
                groupCount: course._count.groups,
            },
        };
    }

    async update(id: number, dto: UpdateCourseDto) {
        const course = await this.prisma.course.findUnique({ where: { id } });

        if (!course) {
            throw new NotFoundException(`ID: ${id} bo'yicha kurs topilmadi`);
        }

        // Nom o'zgarsa — unique tekshirish
        if (dto.name && dto.name !== course.name) {
            const existing = await this.prisma.course.findUnique({
                where: { name: dto.name },
            });
            if (existing) {
                throw new ConflictException('Bu nomdagi kurs allaqachon mavjud');
            }
        }

        const updated = await this.prisma.course.update({
            where: { id },
            data: dto,
        });

        return {
            success: true,
            message: 'Kurs muvaffaqiyatli yangilandi',
            data: updated,
        };
    }

    async restore(id: number) {
        const course = await this.prisma.course.findUnique({ where: { id } });

        if (!course) {
            throw new NotFoundException(`ID: ${id} bo'yicha kurs topilmadi`);
        }

        if (course.status !== 'INACTIVE') {
            throw new BadRequestException(`Bu kurs arxivda emas`);
        }

        await this.prisma.course.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });

        return {
            success: true,
            message: 'Kurs faollashtirildi',
        };
    }

    async remove(id: number) {
        const course = await this.prisma.course.findUnique({ where: { id } });

        if (!course) {
            throw new NotFoundException(`ID: ${id} bo'yicha kurs topilmadi`);
        }

        if (course.status === 'INACTIVE') {
            throw new ConflictException('Bu kurs allaqachon INACTIVE');
        }

        await this.prisma.course.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        return {
            success: true,
            message: "Kurs o'chirildi",
        };
    }
}
