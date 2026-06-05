import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateGiftDto } from './dto/create-gift.dto';
import { UpdateGiftDto } from './dto/update-gift.dto';
import { Role } from '@prisma/client';

@Injectable()
export class GiftsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGiftDto, file: Express.Multer.File, currentUser: { branchId?: number; role: Role }) {
    const branchId = dto.branchId ?? currentUser.branchId;
    if (!branchId) throw new BadRequestException('Branch ID is required');

    return this.prisma.gift.create({
      data: {
        name: dto.name,
        description: dto.description,
        priceInCoins: dto.priceInCoins,
        stock: dto.stock ?? 0,
        status: dto.status ?? 'ACTIVE',
        image: file ? file.filename : null,
        branchId,
      },
    });
  }

  async findAll(currentUser: { branchId?: number; role: Role }) {
    const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
    const gifts = await this.prisma.gift.findMany({
      where: {
        status: { not: 'DELETED' },
        ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      },
      orderBy: { created_at: 'desc' },
    });

    return gifts.map(g => ({
      ...g,
      image: g.image ? `${baseUrl}/uploads/${g.image}` : null,
    }));
  }

  async findOne(id: number) {
    const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
    const gift = await this.prisma.gift.findUnique({ where: { id } });
    if (!gift) throw new NotFoundException('Gift not found');
    
    return {
      ...gift,
      image: gift.image ? `${baseUrl}/uploads/${gift.image}` : null,
    };
  }

  async update(id: number, dto: UpdateGiftDto, file?: Express.Multer.File) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (file) {
      data.image = file.filename;
    }
    
    return this.prisma.gift.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.gift.update({ where: { id }, data: { status: 'DELETED' } });
  }

  async buy(giftId: number, currentUser: { id: number; role: Role }) {
    return this.prisma.$transaction(async (tx) => {
      const gift = await tx.gift.findUnique({ where: { id: giftId } });
      if (!gift) throw new NotFoundException('Gift not found');
      if (gift.stock <= 0) throw new BadRequestException('Gift out of stock');

      let userCoins = 0;
      if (currentUser.role === Role.STUDENT) {
        const student = await tx.student.findUnique({ where: { id: currentUser.id } });
        if (!student) throw new NotFoundException('Student not found');
        userCoins = student.coins;
      } else if (currentUser.role === Role.TEACHER) {
        const teacher = await tx.teacher.findUnique({ where: { id: currentUser.id } });
        if (!teacher) throw new NotFoundException('Teacher not found');
        userCoins = teacher.coins;
      } else {
        const user = await tx.user.findUnique({ where: { id: currentUser.id } });
        if (!user) throw new NotFoundException('User not found');
        userCoins = user.coins;
      }

      if (userCoins < gift.priceInCoins) {
        throw new BadRequestException('Not enough coins');
      }

      // Decrement stock
      await tx.gift.update({
        where: { id: giftId },
        data: { stock: { decrement: 1 } },
      });

      // Decrement user coins
      if (currentUser.role === Role.STUDENT) {
        await tx.student.update({
          where: { id: currentUser.id },
          data: { coins: { decrement: gift.priceInCoins } },
        });
      } else if (currentUser.role === Role.TEACHER) {
        await tx.teacher.update({
          where: { id: currentUser.id },
          data: { coins: { decrement: gift.priceInCoins } },
        });
      } else {
        await tx.user.update({
          where: { id: currentUser.id },
          data: { coins: { decrement: gift.priceInCoins } },
        });
      }

      const adminRoles: Role[] = [Role.SUPERADMIN, Role.CREATOR, Role.ADMIN];

      // Record purchase
      return tx.giftPurchase.create({
        data: {
          giftId,
          priceInCoins: gift.priceInCoins,
          studentId: currentUser.role === Role.STUDENT ? currentUser.id : null,
          teacherId: currentUser.role === Role.TEACHER ? currentUser.id : null,
          userId: adminRoles.includes(currentUser.role) ? currentUser.id : null,
        },
      });
    });
  }
}
