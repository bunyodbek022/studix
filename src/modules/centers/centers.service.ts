import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import PrismaService from 'src/prisma/prisma.service';
import { MailService } from 'src/common/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { Role, Center, User } from '@prisma/client';

@Injectable()
export class CentersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(dto: CreateCenterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { email: dto.creatorEmail },
    });
    if (exists) {
      throw new BadRequestException("Bu email allaqachon ro'yxatdan o'tgan");
    }

    const hashedPassword = await bcrypt.hash(dto.creatorPassword, 10);

    let createdUser: User;
    let createdCenter: Center;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            fullName: dto.creatorFullName,
            email: dto.creatorEmail,
            phone: dto.creatorPhone,
            password: hashedPassword,
            position: dto.creatorPosition,
            role: Role.CREATOR,
            hire_date: new Date(),
            branchId: null, // Creator has no specific branch
          },
        });

        const center = await tx.center.create({
          data: {
            name: dto.centerName,
            creatorId: user.id,
          },
        });

        return { user, center };
      });

      createdUser = result.user;
      createdCenter = result.center;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Markaz yaratishda xatolik yuz berdi',
      );
    }

    try {
      await this.mail.sendCredentials(
        dto.creatorEmail,
        dto.creatorFullName,
        dto.creatorPassword,
      );
    } catch (error) {
      // It's tricky to rollback a transaction after it's committed just because email failed.
      // But we can just log it or notify the superadmin. We won't delete the center.
      console.log('Markaz rahbariga parol yuborishda xatolik: ', error);
    }

    return {
      message:
        "Markaz va markaz rahbari muvaffaqiyatli yaratildi. Parol emailga yuborildi (agar sozlamalar ishlagan bo'lsa).",
      center: createdCenter,
      creator: {
        id: createdUser.id,
        fullName: createdUser.fullName,
        email: createdUser.email,
      },
    };
  }

  findAll() {
    return this.prisma.center.findMany({
      include: {
        creator: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        branches: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.center.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        branches: true,
      },
    });
  }

  update(id: number, updateCenterDto: UpdateCenterDto) {
    const data: any = {};

    if (updateCenterDto.centerName !== undefined) {
      data.name = updateCenterDto.centerName;
    }
    if (updateCenterDto.xpToCoinRatio !== undefined) {
      data.xpToCoinRatio = updateCenterDto.xpToCoinRatio;
    }
    if (updateCenterDto.attendanceXp !== undefined) {
      data.attendanceXp = updateCenterDto.attendanceXp;
    }
    if (updateCenterDto.maxHomeworkXp !== undefined) {
      data.maxHomeworkXp = updateCenterDto.maxHomeworkXp;
    }

    return this.prisma.center.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.center.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
