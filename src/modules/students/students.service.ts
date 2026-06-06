import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/common/mail/mail.service';
import PrismaService from 'src/prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FreezeStudentDto } from './dto/freeze-student.dto';
import { UnfreezeStudentDto } from './dto/unfreeze-student.dto';
import { Status, Prisma } from '@prisma/client';

const SELECT_STUDENT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
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
  ) { }

  private buildPhotoUrl(filename?: string) {
    if (!filename) return null;
    const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
    return `${baseUrl}/uploads/${filename}`;
  }

  async create(
    dto: CreateStudentDto,
    file?: Express.Multer.File,
    currentUser?: { branchId?: number },
  ) {
    const branchId = dto.branchId ?? currentUser?.branchId;
    if (!branchId) {
      throw new BadRequestException('Branch ID is required');
    }

    const exists = await this.prisma.student.findFirst({
      where: { email: dto.email, branchId },
    });

    if (exists) {
      throw new BadRequestException("Bu email allaqachon ro'yxatdan o'tgan");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const student = await this.prisma.student.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        birth_date: new Date(dto.birth_date),
        password: hashedPassword,
        photo: this.buildPhotoUrl(file?.filename),
        branchId,
      },
      select: SELECT_STUDENT,
    });

    try {
      await this.mail.sendCredentials(dto.email, dto.fullName, dto.password);
    } catch (error) {
      console.error("Failed to send credentials email:", error);
    }

    return {
      success: true,
      message: `O'quvchi qo'shildi. Login va parol ${dto.email} manziliga yuborildi.`,
      student,
    };
  }

  async findAll(currentUser?: { branchId?: number }) {
    const students = await this.prisma.student.findMany({
      where: {
        status: { not: 'DELETED' },
        // ADMIN faqat o'z filialini ko'radi
        ...(currentUser?.branchId && {
          branchId: currentUser.branchId,
        }),
      },
      select: SELECT_STUDENT,
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: students,
    };
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

    return {
      success: true,
      data: student,
    };
  }

  async getGroups(id: number) {
    await this.findOne(id);

    const groups = await this.prisma.studentGroup.findMany({
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

    return {
      success: true,
      data: groups,
    };
  }

  async getMyGroupsPaginated(
    id: number,
    query: { page?: string; limit?: string; search?: string; tab?: string; courseId?: string },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereCondition: any = { studentId: id };

    // tab filtering
    if (query.tab === 'arxiv') {
      whereCondition.status = { in: ['INACTIVE', 'DELETED'] };
    } else {
      whereCondition.status = { in: ['ACTIVE', 'FREEZE'] };
    }

    // course filter
    if (query.courseId && query.courseId !== 'all') {
      whereCondition.group = {
        ...whereCondition.group,
        courseId: Number(query.courseId),
      };
    }

    // search filter
    if (query.search) {
      whereCondition.group = {
        ...whereCondition.group,
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { course: { name: { contains: query.search, mode: 'insensitive' } } },
          { teacher: { fullName: { contains: query.search, mode: 'insensitive' } } },
          { room: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      };
    }

    const [total, studentGroups] = await Promise.all([
      this.prisma.studentGroup.count({ where: whereCondition }),
      this.prisma.studentGroup.findMany({
        where: whereCondition,
        skip,
        take: limit,
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
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    // calculate totals for tabs (active vs archive) without search/course filters
    const [activeTotal, archiveTotal] = await Promise.all([
      this.prisma.studentGroup.count({
        where: { studentId: id, status: { in: ['ACTIVE', 'FREEZE'] } },
      }),
      this.prisma.studentGroup.count({
        where: { studentId: id, status: { in: ['INACTIVE', 'DELETED'] } },
      }),
    ]);

    return {
      success: true,
      data: studentGroups,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        activeTotal,
        archiveTotal,
      },
    };
  }

  async getGroupSummary(studentId: number) {
    const studentGroups = await this.prisma.studentGroup.findMany({
      where: {
        studentId,
        status: 'ACTIVE',
      },
      include: {
        group: {
          include: {
            course: true,
            teacher: true,
            lesson: {
              include: {
                lesson: {
                  // Attendance
                  where: {
                    studentId,
                    isPresent: false,
                  },
                },
                lessonHomework: true,
              },
            },
          },
        },
      },
    });

    if (!studentGroups.length) {
      return { success: true, data: [] };
    }

    const data = studentGroups.map((sg) => {
      const group = sg.group;
      const lessons = group.lesson;

      const attendanceMissedCount = lessons.reduce(
        (acc, lesson) => acc + lesson.lesson.length,
        0,
      );

      const homeworkCount = lessons.reduce(
        (acc, lesson) => acc + lesson.lessonHomework.length,
        0,
      );

      const lessonCount = lessons.length;

      return {
        groupId: group.id,
        groupName: group.name,
        courseId: group.course.id,
        courseName: group.course.name,
        teacherName: group.teacher.fullName,
        attendanceMissedCount,
        homeworkCount,
        lessonCount,
      };
    });

    return { success: true, data };
  }

  async getMyAttendanceHistory(studentId: number, groupId: number) {
    const studentGroup = await this.prisma.studentGroup.findUnique({
      where: {
        groupId_studentId: { groupId, studentId },
      },
    });

    if (!studentGroup) {
      throw new NotFoundException(
        `Student ${studentId} does not belong to group ${groupId}`,
      );
    }

    const attendances = await this.prisma.attendance.findMany({
      where: {
        studentId,
        lesson: { groupId },
      },
      include: {
        lesson: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return {
      success: true,
      data: attendances,
    };
  }

  async getAttendanceDetails(studentId: number, groupId: number) {
    const studentGroup = await this.prisma.studentGroup.findUnique({
      where: {
        groupId_studentId: { groupId, studentId },
      },
      include: {
        group: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!studentGroup) {
      throw new NotFoundException(
        `Student ${studentId} does not belong to group ${groupId}`,
      );
    }

    const attendances = await this.prisma.attendance.findMany({
      where: {
        studentId,
        lesson: { groupId },
        isPresent: false,
      },
      include: {
        lesson: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    const items = attendances.map((a) => ({
      attendanceId: a.id,
      lessonId: a.lessonId,
      date: a.created_at.toISOString().split('T')[0],
      courseName: studentGroup.group.course.name,
      topicTitle: a.lesson.title,
      isPresent: a.isPresent,
    }));

    return {
      success: true,
      data: {
        summary: {
          studentId,
          groupId,
          groupName: studentGroup.group.name,
          courseName: studentGroup.group.course.name,
          missedCount: items.length,
        },
        items,
      },
    };
  }

  async getHomeworks(studentId: number, groupId: number) {
    const studentGroup = await this.prisma.studentGroup.findUnique({
      where: {
        groupId_studentId: { groupId, studentId },
      },
    });

    if (!studentGroup) {
      throw new NotFoundException(
        `Student ${studentId} does not belong to group ${groupId}`,
      );
    }

    const homeworks = await this.prisma.homework.findMany({
      where: {
        lesson: { groupId },
      },
      include: {
        lesson: true,
        homeworkResponse: {
          where: { studentId },
          take: 1,
        },
        homeworkResult: {
          where: { studentId },
          take: 1,
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    const data = homeworks.map((hw) => {
      const response = hw.homeworkResponse[0] ?? null;
      const result = hw.homeworkResult[0] ?? null;

      return {
        homeworkId: hw.id,
        title: hw.title,
        lessonTitle: hw.lesson.title,
        createdAt: hw.created_at,
        durationTime: hw.durationTime,
        studentResponseStatus: response?.status ?? null,
        teacherResultStatus: result?.status ?? null,
        score: result?.score ?? null,
      };
    });

    return { success: true, data };
  }

  async update(id: number, dto: UpdateStudentDto, file?: Express.Multer.File) {
    await this.findOne(id);

    const data: Prisma.StudentUpdateInput = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.birth_date !== undefined) {
      data.birth_date = new Date(dto.birth_date);
    }

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    if (file?.filename) {
      data.photo = this.buildPhotoUrl(file.filename);
    }

    const student = await this.prisma.student.update({
      where: { id },
      data,
      select: SELECT_STUDENT,
    });

    return {
      success: true,
      message: "O'quvchi ma'lumotlari yangilandi",
      student,
    };
  }

  async archive(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, status: true, fullName: true, branchId: true },
    });

    if (!student) {
      throw new NotFoundException(`ID: ${id} bo'yicha student topilmadi`);
    }

    if (student.status === 'INACTIVE') {
      throw new BadRequestException('Bu student allaqachon arxivda');
    }

    // Active guruhlarni aniqlash
    const activeStudentGroups = await this.prisma.studentGroup.findMany({
      where: { studentId: id, status: Status.ACTIVE },
      select: { groupId: true },
    });
    const activeGroupIds = activeStudentGroups.map((sg) => sg.groupId);

    // StudentGroup larni INACTIVE qilish
    await this.prisma.studentGroup.updateMany({
      where: {
        studentId: id,
        status: 'ACTIVE',
      },
      data: { status: 'INACTIVE' },
    });

    // Studentni INACTIVE qilish
    await this.prisma.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    // Tarixga saqlash
    await this.prisma.studentHistory.create({
      data: {
        studentId: id,
        type: 'ARCHIVED',
        description: `Student (${student.fullName}) arxivga o'tkazildi. Barcha guruhlardagi statusi INACTIVE qilindi. Guruhlar: ${JSON.stringify(activeGroupIds)}`,
        branchId: student.branchId,
      },
    });

    return {
      success: true,
      message: "Student arxivga o'tkazildi",
    };
  }

  async restore(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, status: true, fullName: true, branchId: true },
    });

    if (!student) {
      throw new NotFoundException(`ID: ${id} bo'yicha student topilmadi`);
    }

    if (student.status !== 'INACTIVE') {
      throw new BadRequestException('Bu student arxivda emas');
    }

    // Oxirgi arxivlangan tarixni topib, guruhlarni tiklash
    const lastArchivedHistory = await this.prisma.studentHistory.findFirst({
      where: { studentId: id, type: 'ARCHIVED' },
      orderBy: { created_at: 'desc' },
    });

    let groupsToRestore: number[] = [];
    if (lastArchivedHistory && lastArchivedHistory.description) {
      try {
        const match =
          lastArchivedHistory.description.match(/Guruhlar: (\[.*\])/);
        if (match && match[1]) {
          groupsToRestore = JSON.parse(match[1]) as number[];
        }
      } catch (e) {
        console.error('Failed to parse archived groups list:', e);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });

      if (groupsToRestore.length > 0) {
        await tx.studentGroup.updateMany({
          where: {
            studentId: id,
            groupId: { in: groupsToRestore },
            status: Status.INACTIVE,
          },
          data: { status: Status.ACTIVE },
        });
      }

      // Tarixga saqlash
      await tx.studentHistory.create({
        data: {
          studentId: id,
          type: 'RESTORED',
          description: `Student (${student.fullName}) arxivdan qayta faollashtirildi. Tiklangan guruhlar soni: ${groupsToRestore.length}`,
          branchId: student.branchId,
        },
      });
    });

    return {
      success: true,
      message: 'Student faollashtirildi',
    };
  }

  async freezeStudent(id: number, dto: FreezeStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, status: true, fullName: true, branchId: true },
    });

    if (!student) {
      throw new NotFoundException(`ID: ${id} bo'yicha student topilmadi`);
    }

    if (student.status === 'FREEZE') {
      throw new BadRequestException('Bu student allaqachon freeze holatida');
    }

    if (student.status === 'DELETED' || student.status === 'INACTIVE') {
      throw new BadRequestException(
        'Faqat ACTIVE studentni freeze qilish mumkin',
      );
    }

    const startDate = new Date(dto.freezeStartDate);
    const endDate = new Date(dto.freezeEndDate);

    if (endDate <= startDate) {
      throw new BadRequestException(
        "Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Studentni freeze qilish
      await tx.student.update({
        where: { id },
        data: {
          status: 'FREEZE',
          freezeStartDate: startDate,
          freezeEndDate: endDate,
          unfrozenAt: null,
        },
      });

      // Barcha ACTIVE StudentGroup larni FREEZE qilish
      await tx.studentGroup.updateMany({
        where: { studentId: id, status: Status.ACTIVE },
        data: {
          status: 'FREEZE',
          freezeStartDate: startDate,
          freezeEndDate: endDate,
          unfrozenAt: null,
        },
      });

      // Tarixga saqlash
      await tx.studentHistory.create({
        data: {
          studentId: id,
          type: 'FROZEN',
          description: `Student (${student.fullName}) freeze qilindi. Davr: ${dto.freezeStartDate} → ${dto.freezeEndDate}`,
          branchId: student.branchId,
        },
      });
    });

    return {
      success: true,
      message: `Student freeze qilindi. Davr: ${dto.freezeStartDate} → ${dto.freezeEndDate}`,
    };
  }

  async unfreezeStudent(id: number, dto: UnfreezeStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        fullName: true,
        branchId: true,
        freezeStartDate: true,
        freezeEndDate: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`ID: ${id} bo'yicha student topilmadi`);
    }

    if (student.status !== 'FREEZE') {
      throw new BadRequestException('Bu student freeze holatida emas');
    }

    const unfrozenAt = dto.unfrozenAt ? new Date(dto.unfrozenAt) : new Date();

    await this.prisma.$transaction(async (tx) => {
      // Studentni ACTIVE ga qaytarish
      await tx.student.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          unfrozenAt,
        },
      });

      // Barcha FREEZE StudentGroup larni ACTIVE ga qaytarish
      await tx.studentGroup.updateMany({
        where: { studentId: id, status: 'FREEZE' },
        data: {
          status: 'ACTIVE',
          unfrozenAt,
        },
      });

      // Tarixga saqlash
      await tx.studentHistory.create({
        data: {
          studentId: id,
          type: 'UNFROZEN',
          description: `Student (${student.fullName}) freeze dan chiqarildi. Erta chiqarilish sanasi: ${unfrozenAt.toISOString().split('T')[0]}`,
          branchId: student.branchId,
        },
      });
    });

    return {
      success: true,
      message: 'Student freeze dan chiqarildi',
      unfrozenAt: unfrozenAt.toISOString().split('T')[0],
    };
  }

  async remove(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, status: true, fullName: true, branchId: true },
    });

    if (!student) {
      throw new NotFoundException(`ID: ${id} bo'yicha student topilmadi`);
    }

    if (student.status === 'DELETED') {
      throw new BadRequestException("Bu student allaqachon o'chirilgan");
    }

    // StudentGroup lardan DELETED qilish
    await this.prisma.studentGroup.updateMany({
      where: { studentId: id },
      data: {
        status: Status.DELETED,
      },
    });

    // Studentni DELETED qilish
    await this.prisma.student.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    // Tarixga saqlash
    await this.prisma.studentHistory.create({
      data: {
        studentId: id,
        type: 'DELETED',
        description: `Student (${student.fullName}) tizimdan o'chirildi. Barcha guruhlardan olib tashlandi`,
        branchId: student.branchId,
      },
    });

    return {
      success: true,
      message: "Student o'chirildi",
    };
  }
}
