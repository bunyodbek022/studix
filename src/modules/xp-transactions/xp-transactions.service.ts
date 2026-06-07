import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateXpTransactionDto } from './dto/create-xp-transaction.dto';
import { Role } from '@prisma/client';

@Injectable()
export class XpTransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateXpTransactionDto,
    currentUser: { id: number; branchId?: number; role: Role },
  ) {
    if (!dto.studentId && !dto.teacherId && !dto.userId) {
      throw new BadRequestException(
        'Bitta qabul qiluvchi (student, teacher yoki admin) tanlanishi shart',
      );
    }

    const branchId = currentUser.branchId;
    if (!branchId) throw new BadRequestException('Branch ID is required');

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { center: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const ratio = branch.center.xpToCoinRatio || 1;
    const amountCoin = dto.amountXp * ratio;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.xpTransaction.create({
        data: {
          branchId,
          amountXp: dto.amountXp,
          amountCoin,
          sourceRole: currentUser.role,
          sourceId: currentUser.id,
          studentId: dto.studentId,
          teacherId: dto.teacherId,
          userId: dto.userId,
          reasonId: dto.reasonId,
          description: dto.description,
        },
      });

      if (dto.studentId) {
        await tx.student.update({
          where: { id: dto.studentId },
          data: {
            xp: { increment: dto.amountXp },
            coins: { increment: amountCoin },
          },
        });
      } else if (dto.teacherId) {
        await tx.teacher.update({
          where: { id: dto.teacherId },
          data: {
            xp: { increment: dto.amountXp },
            coins: { increment: amountCoin },
          },
        });
      } else if (dto.userId) {
        await tx.user.update({
          where: { id: dto.userId },
          data: {
            xp: { increment: dto.amountXp },
            coins: { increment: amountCoin },
          },
        });
      }

      return transaction;
    });
  }

  async findAll(currentUser: { branchId?: number; role: Role }) {
    return this.prisma.xpTransaction.findMany({
      where: {
        ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      },
      include: {
        reason: true,
        student: { select: { id: true, fullName: true } },
        teacher: { select: { id: true, fullName: true } },
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.xpTransaction.findUnique({
      where: { id },
      include: {
        reason: true,
      },
    });
  }
}
