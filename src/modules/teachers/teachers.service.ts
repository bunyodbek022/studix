import {BadRequestException,Injectable,NotFoundException, UnauthorizedException,} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/common/mail/mail.service';
import PrismaService from 'src/prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtService } from '@nestjs/jwt';


const SELECT_TEACHER = {
  id: true,
  fullName: true,
  email: true,
  photo: true,
  position: true,
  experience: true,
  status: true,
  created_at: true,
  updated_at: true,
  role:true
};

@Injectable()
export class TeachersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private jwt:JwtService
  ) {}

  async create(dto: CreateTeacherDto) {
    const exists = await this.prisma.teacher.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new BadRequestException('Bu email allaqachon ro\'yxatdan o\'tgan');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const teacher = await this.prisma.teacher.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        position: dto.position,
        experience: dto.experience,
        password: hashedPassword,
        
      },
      select: SELECT_TEACHER,
    });

    await this.mail.sendCredentials(dto.email, dto.fullName, dto.password);

    return {
      message: `O'qituvchi qo'shildi. Login va parol ${dto.email} manziliga yuborildi.`,
      teacher,
    };
  }


  async findAll() {
    return this.prisma.teacher.findMany({
      select: SELECT_TEACHER,
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: {
        ...SELECT_TEACHER,
        groups: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            startTime: true,
            weekDays: true,
            course: { select: { id: true, name: true } },
            room: { select: { id: true, name: true } },
          },
        },
        rating: {
          select: {
            id: true,
            score: true,
            created_at: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`ID: ${id} bo'yicha o'qituvchi topilmadi`);
    }

    const avgRating =
      teacher.rating.length > 0
        ? teacher.rating.reduce((sum, r) => sum + r.score, 0) /
          teacher.rating.length
        : null;

    return { ...teacher, avgRating };
  }

  async update(id: number, dto: UpdateTeacherDto) {
    await this.findOne(id);

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: dto,
      select: SELECT_TEACHER,
    });

    return { message: 'O\'qituvchi ma\'lumotlari yangilandi', teacher };
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.teacher.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: `O'qituvchi (ID: ${id}) o'chirildi` };
  }

  async getGroups(id: number) {
    await this.findOne(id);

    return this.prisma.group.findMany({
      where: { teacherId: id },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        startTime: true,
        weekDays: true,
        course: { select: { id: true, name: true, level: true } },
        room: { select: { id: true, name: true } },
        _count: { select: { studentGroup: true, lesson: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updatePhoto(id: number, filename: string) {
    await this.findOne(id);

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: { photo: filename },
      select: { id: true, fullName: true, photo: true },
    });

    const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
    return {
      message: 'Rasm muvaffaqiyatli yuklandi',
      photo: `${baseUrl}/uploads/${filename}`,
      teacher,
    };
  }
}