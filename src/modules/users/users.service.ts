import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import PrismaService from 'src/prisma/prisma.service';
import { MailService } from 'src/common/mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

const SELECT_USER = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  position: true,
  role: true,
  status: true,
  hire_date: true,
  address: true,
  photo: true,
  created_at: true,
  updated_at: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(dto: CreateUserDto, currentUser?: { branchId?: number }) {
    const branchId = dto.branchId ?? currentUser?.branchId;

    if (branchId) {
      const existBranch = await this.prisma.branch.findUnique({
        where: { id: branchId },
      });
      if (!existBranch) {
        throw new BadRequestException(
          `ID: ${branchId} bo'yicha filial topilmadi`,
        );
      }
    }

    const exists = await this.prisma.user.findFirst({
      where: { email: dto.email, branchId },
    });
    if (exists) {
      throw new BadRequestException("Bu email allaqachon ro'yxatdan o'tgan");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        position: dto.position,
        hire_date: new Date(dto.hire_date),
        role: dto.role,
        address: dto.address,
        password: hashedPassword,
        branchId,
      },
      select: SELECT_USER,
    });

    try {
      await this.mail.sendCredentials(dto.email, dto.fullName, dto.password);
    } catch (error) {
      await this.prisma.user.deleteMany({ where: { email: dto.email } });
      console.log(error);

      throw new InternalServerErrorException(
        'Email yuborishda xatolik. User yaratilmadi.',
      );
    }

    return {
      message: `Ro'yxatdan o'tish muvaffaqiyatli. Login va parol ${dto.email} manziliga yuborildi.`,
      user,
    };
  }

  async findAll(currentUser?: { branchId?: number }) {
    return this.prisma.user.findMany({
      where: {
        status: { not: 'DELETED' },
        // ADMIN faqat o'z filialini ko'radi
        ...(currentUser?.branchId && {
          branchId: currentUser.branchId,
        }),
      },
      select: SELECT_USER,
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SELECT_USER,
    });

    if (!user) {
      throw new NotFoundException(`ID: ${id} bo'yicha foydalanuvchi topilmadi`);
    }

    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Prisma.UserUpdateInput = { ...dto };
    if (dto.hire_date) {
      data.hire_date = new Date(dto.hire_date);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: SELECT_USER,
    });

    return { message: "Foydalanuvchi ma'lumotlari yangilandi", user };
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.user.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return { message: `Foydalanuvchi (ID: ${id}) o'chirildi` };
  }

  async updatePhoto(id: number, filename: string) {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { photo: filename },
      select: { id: true, fullName: true, photo: true },
    });

    const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
    return {
      message: 'Rasm muvaffaqiyatli yuklandi',
      photo: `${baseUrl}/uploads/${filename}`,
      user,
    };
  }
}
