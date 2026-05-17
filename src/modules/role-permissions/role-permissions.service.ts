import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import PrismaService from 'src/prisma/prisma.service';

@Injectable()
export class RolePermissionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRolePermissionDto) {
    const existing = await this.prisma.rolePermission.findFirst({
        where: {
            name: dto.name,
            category: dto.label, // mapped to category
            branchId: dto.branchId || null
        }
    });

    if (existing) {
        throw new ConflictException(`Bu kasb (rol) uchun ${dto.label} huquqlari allaqachon mavjud.`);
    }

    return this.prisma.rolePermission.create({
      data: {
        name: dto.name,
        color: dto.color,
        category: dto.label,
        actions: dto.actions,
        status: dto.status,
        branchId: dto.branchId,
        centerId: dto.centerId,
      },
    });
  }

  findAll() {
    return this.prisma.rolePermission.findMany({
        orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: { id },
    });
    if (!rolePermission) throw new NotFoundException('Role permission topilmadi');
    return rolePermission;
  }

  async update(id: number, dto: UpdateRolePermissionDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.label) data.category = dto.label;
    delete data.label;

    return this.prisma.rolePermission.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.rolePermission.delete({
      where: { id },
    });
  }
}
