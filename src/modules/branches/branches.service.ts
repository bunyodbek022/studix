import { Injectable } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import PrismaService from 'src/prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  create(createBranchDto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: createBranchDto,
    });
  }

  findAll() {
    return this.prisma.branch.findMany({
      include: {
        center: { select: { id: true, name: true } },
      }
    });
  }

  findOne(id: number) {
    return this.prisma.branch.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true } },
      }
    });
  }

  update(id: number, updateBranchDto: UpdateBranchDto) {
    return this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
    });
  }

  remove(id: number) {
    return this.prisma.branch.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
