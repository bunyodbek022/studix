import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FindAllRoomsDto } from './dto/find-all-rooms.dto';

@Injectable()
export class RoomsService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateRoomDto) {
        const existing = await this.prisma.room.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Bu nomdagi xona allaqachon mavjud');
        }

        const room = await this.prisma.room.create({
            data: dto,
        });

        return {
            success: true,
            message: 'Xona yaratildi',
            data: room,
        };
    }

    async findAll(query: FindAllRoomsDto) {
        const { page = 1, limit = 10, search, status } = query;
        const skip = (page - 1) * limit;

        const where = {
            status: status ?? { not: 'DELETED' as const },
            ...(search && {
                name: { contains: search, mode: 'insensitive' as const },
            }),
        };

        const [rooms, total] = await this.prisma.$transaction([
            this.prisma.room.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.room.count({ where }),
        ]);

        return {
            success: true,
            data: rooms,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const room = await this.prisma.room.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { groups: true },
                },
            },
        });

        if (!room) {
            throw new NotFoundException(`ID: ${id} bo'yicha xona topilmadi`);
        }

        return {
            success: true,
            data: {
                ...room,
                groupCount: room._count.groups,
            },
        };
    }

    async update(id: number, dto: UpdateRoomDto) {
        const room = await this.prisma.room.findUnique({ where: { id } });

        if (!room) {
            throw new NotFoundException(`ID: ${id} bo'yicha xona topilmadi`);
        }

        if (dto.name && dto.name !== room.name) {
            const existing = await this.prisma.room.findUnique({
                where: { name: dto.name },
            });
            if (existing) {
                throw new ConflictException('Bu nomdagi xona allaqachon mavjud');
            }
        }

        const updated = await this.prisma.room.update({
            where: { id },
            data: dto,
        });

        return {
            success: true,
            message: 'Xona yangilandi',
            data: updated,
        };
    }

    async archive(id: number) {
        const room = await this.prisma.room.findUnique({ where: { id } });

        if (!room) {
            throw new NotFoundException(`ID: ${id} bo'yicha xona topilmadi`);
        }

        if (room.status === 'INACTIVE') {
            throw new BadRequestException('Bu xona allaqachon arxivda');
        }

        // Xonada aktiv guruhlar bormi tekshirish
        const activeGroups = await this.prisma.group.count({
            where: { roomId: id, status: 'ACTIVE' },
        });

        if (activeGroups > 0) {
            throw new BadRequestException(
                `Xonani arxivga o'tkazish uchun avval ${activeGroups} ta aktiv guruhni boshqa xonaga o'tkazing`,
            );
        }

        await this.prisma.room.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        return {
            success: true,
            message: 'Xona arxivga o\'tkazildi',
        };
    }

    async restore(id: number) {
        const room = await this.prisma.room.findUnique({ where: { id } });

        if (!room) {
            throw new NotFoundException(`ID: ${id} bo'yicha xona topilmadi`);
        }

        if (room.status !== 'INACTIVE') {
            throw new BadRequestException('Bu xona arxivda emas');
        }

        await this.prisma.room.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });

        return {
            success: true,
            message: 'Xona faollashtirildi',
        };
    }

    async remove(id: number) {
        const room = await this.prisma.room.findUnique({ where: { id } });

        if (!room) {
            throw new NotFoundException(`ID: ${id} bo'yicha xona topilmadi`);
        }

        if (room.status === 'DELETED') {
            throw new BadRequestException('Bu xona allaqachon o\'chirilgan');
        }

        // Aktiv guruhlar bormi tekshirish
        const activeGroups = await this.prisma.group.count({
            where: { roomId: id, status: 'ACTIVE' },
        });

        if (activeGroups > 0) {
            throw new BadRequestException(
                `Xonani o'chirish uchun avval ${activeGroups} ta aktiv guruhni boshqa xonaga o'tkazing`,
            );
        }

        await this.prisma.room.update({
            where: { id },
            data: { status: 'DELETED' },
        });

        return {
            success: true,
            message: 'Xona o\'chirildi',
        };
    }
}