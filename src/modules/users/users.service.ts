import {BadRequestException,Injectable,NotFoundException,} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import PrismaService from 'src/prisma/prisma.service';
import { MailService } from 'src/common/mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

const SELECT_USER = {
  id: true,
  fullName: true,
  email: true,
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

  private generatePassword(length = 12): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*()-_=+[]{}';
    const all = upper + lower + digits + symbols;

    
    const password =
      upper[Math.floor(Math.random() * upper.length)] +
      lower[Math.floor(Math.random() * lower.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      symbols[Math.floor(Math.random() * symbols.length)] +
      Array.from({ length: length - 4 }, () =>
        all[Math.floor(Math.random() * all.length)],
      ).join('');

    
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new BadRequestException('Bu email allaqachon ro\'yxatdan o\'tgan');
    }

    const plainPassword = this.generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        position: dto.position,
        hire_date: new Date(dto.hire_date),
        role: dto.role,
        address: dto.address,
        password: hashedPassword,
      },
      select: SELECT_USER,
    });

    await this.mail.sendCredentials(dto.email, dto.fullName, plainPassword);

    return {
      message: `Ro'yxatdan o'tish muvaffaqiyatli. Login va parol ${dto.email} manziliga yuborildi.`,
      user,
    };
  }

  async findAll() {
    return this.prisma.user.findMany({
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

    const data: any = { ...dto };
    if (dto.hire_date) {
      data.hire_date = new Date(dto.hire_date);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: SELECT_USER,
    });

    return { message: 'Foydalanuvchi ma\'lumotlari yangilandi', user };
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
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