import {BadRequestException,Injectable,NotFoundException, UnauthorizedException,} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/common/mail/mail.service';
import  PrismaService  from "src/prisma/prisma.service"
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtService } from '@nestjs/jwt';

const SELECT_STUDENT = {
  id: true,
  fullName: true,
  email: true,
  photo: true,
  birth_date: true,
  status: true,
  created_at: true,
  updated_at: true,
};

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private jwt:JwtService
  ) {}



  
  async create(dto: CreateStudentDto) {
    const exists = await this.prisma.student.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new BadRequestException("Bu email allaqachon ro'yxatdan o'tgan");
    }
      
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const student = await this.prisma.student.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        birth_date: new Date(dto.birth_date),
        password: hashedPassword,
      },
      select: SELECT_STUDENT,
    });

    await this.mail.sendCredentials(dto.email, dto.fullName, dto.password);

    return {
      message: `O'quvchi qo'shildi. Login va parol ${dto.email} manziliga yuborildi.`
    };
  }


  async findAll() {
    return this.prisma.student.findMany({
      select: SELECT_STUDENT,
      orderBy: { created_at: 'desc' },
    });
  }

 
  async findOne(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        ...SELECT_STUDENT,
        StudentGroups: {
          select: {
            status: true,
            group: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                startTime: true,
                weekDays: true,
                course: { select: { id: true, name: true, level: true } },
                teacher: { select: { id: true, fullName: true } },
                room: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`ID: ${id} bo'yicha o'quvchi topilmadi`);
    }

    return student;
  }

  
  async update(id: number, dto: UpdateStudentDto) {
    await this.findOne(id);

    const data: any = { ...dto };
    if (dto.birth_date) {
      data.birth_date = new Date(dto.birth_date);
    }

    const student = await this.prisma.student.update({
      where: { id },
      data,
      select: SELECT_STUDENT,
    });

    return { message: "O'quvchi ma'lumotlari yangilandi", student };
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: `O'quvchi (ID: ${id}) o'chirildi` };
  }

  async getGroups(id: number) {
    await this.findOne(id);

    return this.prisma.studentGroup.findMany({
      where: { studentId: id },
      select: {
        id: true,
        status: true,
        group: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            startTime: true,
            weekDays: true,
            course: { select: { id: true, name: true, level: true } },
            teacher: { select: { id: true, fullName: true } },
            room: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async updatePhoto(id: number, filename: string) {
    await this.findOne(id);

    const student = await this.prisma.student.update({
      where: { id },
      data: { photo: `http://localhost:4000/uploads/${filename}` },
      select: { id: true, fullName: true, photo: true },
    });

    const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
    return {
      message: 'Rasm muvaffaqiyatli yuklandi',
      photo: `${baseUrl}/uploads/${filename}`,
      student,
    };
  }
}