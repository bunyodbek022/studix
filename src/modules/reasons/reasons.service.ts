import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateReasonDto } from './dto/create-reason.dto';
import { UpdateReasonDto } from './dto/update-reason.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ReasonsService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateReasonDto, currentUser: { branchId?: number; role: Role }) {
    const branchId = dto.branchId ?? currentUser.branchId;
    if (!branchId) throw new BadRequestException('Branch ID is required');

    return this.prisma.reason.create({
      data: {
        name: dto.name,
        category: dto.category,
        roles: dto.roles,
        branchId,
      },
    });
  }

  async findAll(currentUser: { branchId?: number; role: Role }) {
    return this.prisma.reason.findMany({
      where: {
        ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const reason = await this.prisma.reason.findUnique({ where: { id } });
    if (!reason) throw new NotFoundException('Reason not found');
    return reason;
  }

  async update(id: number, dto: UpdateReasonDto) {
    await this.findOne(id);
    return this.prisma.reason.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.reason.delete({ where: { id } });
  }
}
