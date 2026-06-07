import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { TokenPayload } from 'src/common/interfaces/request-with-user.interface';
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

  async findAll(currentUser?: { branchId?: number }, queryBranchId?: number) {
    const targetBranchId = currentUser?.branchId || queryBranchId;

    const students = await this.prisma.student.findMany({
      where: {
        status: { not: 'DELETED' },
        ...(targetBranchId && {
          branchId: targetBranchId,
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

  async findOne(id: number, currentUser?: { branchId?: number }) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        ...SELECT_STUDENT,
        branchId: true,
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

    if (currentUser?.branchId && student.branchId !== currentUser.branchId) {
      throw new NotFoundException(`ID: ${id} bo'yicha o'quvchi topilmadi`);
    }

    return {
      success: true,
      data: student,
    };
  }

  async getGroups(id: number, currentUser?: { branchId?: number }) {
    await this.findOne(id, currentUser);

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

  async getStudentRating(
    user: TokenPayload,
    query: { type: 'GROUP' | 'BRANCH' | 'CENTER'; groupId?: string; page?: string; limit?: string; search?: string },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentStudent = await this.prisma.student.findUnique({
      where: { id: user.id },
      select: { id: true, xp: true, branch: { select: { centerId: true } } },
    });

    if (!currentStudent) {
      throw new NotFoundException('Student not found');
    }

    const whereCondition: any = {
      status: { in: ['ACTIVE', 'FREEZE'] },
    };

    if (query.type === 'GROUP') {
      if (!query.groupId) {
        throw new BadRequestException('groupId is required for GROUP rating');
      }
      whereCondition.StudentGroups = {
        some: {
          groupId: Number(query.groupId),
          status: { in: ['ACTIVE', 'FREEZE'] }
        }
      };
    } else if (query.type === 'BRANCH') {
      whereCondition.branchId = user.branchId;
    } else if (query.type === 'CENTER') {
      const centerId = currentStudent.branch.centerId;
      const branches = await this.prisma.branch.findMany({
        where: { centerId },
        select: { id: true },
      });
      const branchIds = branches.map((b) => b.id);
      whereCondition.branchId = { in: branchIds };
    }

    if (query.search) {
      whereCondition.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where: whereCondition }),
      this.prisma.student.findMany({
        where: whereCondition,
        orderBy: [
          { xp: 'desc' },
          { id: 'asc' },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          photo: true,
          xp: true,
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Calculate rank for each student in the paginated result
    const data = students.map((s, idx) => ({
      ...s,
      rank: skip + idx + 1,
    }));

    // Find absolute rank of the current user within the SAME filter
    // Absolute rank = count of students with xp > my xp + 1
    // Tie breaker: if xp is same, id < my id
    let currentUserRating: any = null;

    const isCurrentUserInResults = data.some((s) => s.id === currentStudent.id);

    if (!isCurrentUserInResults) {
      const higherXpCount = await this.prisma.student.count({
        where: {
          ...whereCondition,
          OR: [
            { xp: { gt: currentStudent.xp } },
            { xp: currentStudent.xp, id: { lt: currentStudent.id } },
          ],
        },
      });

      // Get current user info to append if they match the filter
      const currentUserInFilter = await this.prisma.student.findFirst({
        where: {
          id: currentStudent.id,
          ...whereCondition,
        },
        select: {
          id: true,
          fullName: true,
          photo: true,
          xp: true,
          branch: { select: { id: true, name: true } },
        },
      });

      if (currentUserInFilter) {
        currentUserRating = {
          ...currentUserInFilter,
          rank: higherXpCount + 1,
        };
      }
    }

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      currentUserRating,
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

  async getStudentDashboard(user: TokenPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id: user.id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 1. Gamification Metrics
    const { xp, coins } = student;

    // 2. Branch Rank
    const higherXpCount = await this.prisma.student.count({
      where: {
        branchId: student.branchId,
        status: 'ACTIVE',
        OR: [
          { xp: { gt: student.xp } },
          { xp: student.xp, id: { lt: student.id } },
        ],
      },
    });
    const rank = higherXpCount + 1;

    // 3. Attendance
    const attendances = await this.prisma.attendance.findMany({
      where: { studentId: student.id },
      select: { isPresent: true },
    });

    const totalLessons = attendances.length;
    const presentLessons = attendances.filter((a) => a.isPresent).length;
    const attendanceRate = totalLessons > 0 ? Math.round((presentLessons / totalLessons) * 100) : 0;

    // 4. Active Groups (Schedule)
    const studentGroups = await this.prisma.studentGroup.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      include: {
        group: {
          include: {
            course: { select: { name: true } },
            teacher: { select: { fullName: true } },
            room: { select: { name: true } }
          }
        }
      }
    });

    const activeGroups = studentGroups.map(sg => ({
      id: sg.group.id,
      name: sg.group.name,
      courseName: sg.group.course.name,
      teacherName: sg.group.teacher.fullName,
      roomName: sg.group.room.name,
      startTime: sg.group.startTime,
      weekDays: sg.group.weekDays,
    }));

    // 5. Recent Activity
    const recentActivities = await this.prisma.xpTransaction.findMany({
      where: { studentId: student.id },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { reason: { select: { name: true } } }
    });

    const formattedActivities = recentActivities.map(a => ({
      id: a.id,
      title: a.reason ? a.reason.name : a.description || 'Qo\'shimcha tranzaksiya',
      xp: a.amountXp,
      coin: a.amountCoin,
      isAddXp: a.amountXp > 0,
      isAddCoin: a.amountCoin > 0,
      createdAt: a.created_at,
    }));

    // 6. Homework Stats
    const activeGroupIds = studentGroups.map(sg => sg.groupId);
    const totalHomeworks = await this.prisma.homework.count({
      where: { lesson: { groupId: { in: activeGroupIds } } }
    });

    const completedHomeworks = await this.prisma.homeworkResponse.count({
      where: { studentId: student.id, status: 'COMPLETED' }
    });

    // 7. Weekly XP Data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const xpTransactionsThisWeek = await this.prisma.xpTransaction.findMany({
      where: {
        studentId: student.id,
        created_at: { gte: sevenDaysAgo }
      },
      select: { amountXp: true, created_at: true }
    });

    const daysMapForChart = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
    const weeklyXpData: { name: string; xp: number; dateStr: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      weeklyXpData.push({
        name: daysMapForChart[d.getDay()],
        xp: 0,
        dateStr: d.toDateString()
      });
    }

    xpTransactionsThisWeek.forEach(tx => {
      if (tx.amountXp > 0) {
        const txDateStr = new Date(tx.created_at).toDateString();
        const dayData = weeklyXpData.find(d => d.dateStr === txDateStr);
        if (dayData) {
          dayData.xp += tx.amountXp;
        }
      }
    });

    const finalWeeklyXpData = weeklyXpData.map(d => ({ name: d.name, xp: d.xp }));

    return {
      success: true,
      data: {
        xp,
        coins,
        rank,
        attendanceRate,
        totalLessons,
        presentLessons,
        activeGroups,
        recentActivities: formattedActivities,
        homeworkStats: {
          total: totalHomeworks,
          completed: completedHomeworks
        },
        weeklyXpData: finalWeeklyXpData
      }
    };
  }

  async getGroupCalendar(studentId: number, groupId: number, month: number, year?: number) {
    // 1. Verify that the student is actually in this group
    const isMember = await this.prisma.studentGroup.findFirst({
      where: {
        studentId,
        groupId,
        status: 'ACTIVE',
      }
    });

    if (!isMember) {
      throw new NotFoundException(`Guruh topilmadi yoki siz bu guruh a'zosi emassiz`);
    }

    // 2. Fetch group schedule info
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        course: { select: { durationMonth: true, durationLesson: true } },
        lesson: {
          select: {
            id: true,
            title: true,
            lessonDate: true,
            created_at: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Guruh topilmadi`);
    }

    const WEEK_DAY_MAP: Record<string, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    const startDate = new Date(group.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + group.course.durationMonth);

    const scheduleDays: {
      date: string;
      dayLabel: string;
      monthLabel: string;
      isWeekend: boolean;
      lesson: { id: number; title: string } | null;
    }[] = [];

    const lessonDateMap = new Map<string, { id: number; title: string }>();
    for (const lesson of group.lesson) {
      const dateKey =
        lesson.lessonDate ??
        new Date(lesson.created_at).toISOString().split('T')[0];

      lessonDateMap.set(dateKey, {
        id: lesson.id,
        title: lesson.title,
      });
    }

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const isClassDay = group.weekDays.some(
        (day) => WEEK_DAY_MAP[day] === dayOfWeek,
      );

      if (isClassDay) {
        const dateKey = current.toISOString().split('T')[0];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        scheduleDays.push({
          date: dateKey,
          dayLabel: current.getDate().toString().padStart(2, '0'),
          monthLabel: current.toLocaleString('uz-UZ', { month: 'short' }),
          isWeekend,
          lesson: lessonDateMap.get(dateKey) || null,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    const targetYear = year ?? new Date().getFullYear();
    const filteredScheduleDays = scheduleDays.filter((day) => {
      const dayDate = new Date(day.date);
      return (
        dayDate.getMonth() + 1 === month && dayDate.getFullYear() === targetYear
      );
    });

    return {
      success: true,
      data: {
        groupId: group.id,
        groupName: group.name,
        startTime: group.startTime,
        durationLesson: group.course.durationLesson,
        scheduleDays: filteredScheduleDays,
      },
    };
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

  async getHomeworks(studentId: number, groupId: number, currentUser?: { branchId?: number }) {
    await this.findOne(studentId, currentUser);

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
