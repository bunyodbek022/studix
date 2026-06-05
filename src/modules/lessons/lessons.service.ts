import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Role, Status } from '@prisma/client';
import { SaveAttendanceDto } from './dto/save-attendance.dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async createLesson(
    payload: CreateLessonDto,
    currentUser: { id: number; role: Role },
  ) {
    const existGroup = await this.prisma.group.findUnique({
      where: { id: payload.groupId, status: Status.ACTIVE },
    });

    if (!existGroup) {
      throw new NotFoundException('Group not found with this id');
    }

    let taskDate = payload.lessonDate;
    if (!taskDate) {
      const tashkentOffset = 5 * 60 * 60 * 1000;
      const localTime = new Date(Date.now() + tashkentOffset);
      taskDate = localTime.toISOString().split('T')[0];
    }

    await this.prisma.lesson.create({
      data: {
        groupId: payload.groupId,
        title: payload.title,
        lessonDate: taskDate,
        branchId: existGroup.branchId,
        teacherId: currentUser.role == Role.TEACHER ? currentUser.id : null,
        userId: currentUser.role != Role.TEACHER ? currentUser.id : null,
      },
    });
    return {
      success: true,
      message: 'lesson created successfully',
    };
  }

  async saveAttendance(
    lessonId: number,
    dto: SaveAttendanceDto,
    currentUser: { id: number, role: Role },
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, groupId: true, branchId: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Dars topilmadi: ${lessonId}`);
    }

    // Get center settings for XP
    const branch = await this.prisma.branch.findUnique({
      where: { id: lesson.branchId },
      include: { center: true },
    });
    const attendanceXp = branch?.center.attendanceXp || 0;
    const ratio = branch?.center.xpToCoinRatio || 1;
    const attendanceCoins = attendanceXp * ratio;

    // Guruhda o'qiyotgan studentlar
    const studentGroups = await this.prisma.studentGroup.findMany({
      where: {
        groupId: lesson.groupId,
      },
      select: { studentId: true },
    });

    const validStudentIds = new Set(studentGroups.map((sg) => sg.studentId));

    // Noto'g'ri studentId tekshirish
    const invalidIds = dto.items.filter(
      (item) => !validStudentIds.has(item.studentId),
    );
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Bu guruhda bo'lmagan studentlar: ${invalidIds.map((i) => i.studentId).join(', ')}`,
      );
    }

    // Old attendances
    const oldAttendances = await this.prisma.attendance.findMany({
      where: { lessonId },
    });
    const oldState = new Map(oldAttendances.map(a => [a.studentId, a.isPresent]));

    // Transaction to save attendance and update XP
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        // Upsert attendance
        await tx.attendance.upsert({
          where: {
            lessonId_studentId: {
              lessonId,
              studentId: item.studentId,
            },
          },
          update: {
            isPresent: item.isPresent,
            userId: currentUser.id,
          },
          create: {
            lessonId,
            studentId: item.studentId,
            isPresent: item.isPresent,
            userId: currentUser.id,
            branchId: lesson.branchId,
          },
        });

        // XP logic
        const wasPresent = oldState.get(item.studentId);
        const isPresentNow = item.isPresent;

        if (attendanceXp > 0) {
          let xpChange = 0;
          let coinChange = 0;

          if (isPresentNow && !wasPresent) {
            // Became present
            xpChange = attendanceXp;
            coinChange = attendanceCoins;
          } else if (!isPresentNow && wasPresent) {
            // Became absent (undo XP)
            xpChange = -attendanceXp;
            coinChange = -attendanceCoins;
          }

          if (xpChange !== 0) {
            await tx.xpTransaction.create({
              data: {
                branchId: lesson.branchId,
                amountXp: xpChange,
                amountCoin: coinChange,
                sourceRole: currentUser.role,
                sourceId: currentUser.id,
                studentId: item.studentId,
                description: `Dars davomati uchun (${xpChange > 0 ? 'Kirdi' : 'Chiqdi'})`,
              },
            });

            await tx.student.update({
              where: { id: item.studentId },
              data: {
                xp: { increment: xpChange },
                coins: { increment: coinChange },
              },
            });
          }
        }
      }
    });

    return {
      success: true,
      message: 'Davomat saqlandi va XP hisoblandi',
    };
  }

  async getAttendance(lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, groupId: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Dars topilmadi: ${lessonId}`);
    }

    const attendances = await this.prisma.attendance.findMany({
      where: { lessonId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            photo: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return {
      success: true,
      data: attendances.map((a) => ({
        id: a.id,
        studentId: a.studentId,
        isPresent: a.isPresent,
        student: a.student,
      })),
    };
  }

  async findOne(id: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        lessonVideo: true,
        group: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return {
      success: true,
      data: lesson,
    };
  }

  async update(id: number, dto: UpdateLessonDto) {
    const existLesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!existLesson) {
      throw new NotFoundException('Lesson not found');
    }

    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: { ...dto },
    });

    return {
      success: true,
      message: 'Lesson updated successfully',
      data: updatedLesson,
    };
  }

  async remove(id: number) {
    const existLesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!existLesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.prisma.$transaction([
      this.prisma.attendance.deleteMany({
        where: { lessonId: id },
      }),
      this.prisma.lesson.delete({
        where: { id },
      }),
    ]);

    return {
      success: true,
      message: 'Lesson deleted successfully',
    };
  }

  async getLessonsByDate(
    groupId: number,
    year?: number,
    month?: number,
    day?: number,
  ) {
    const existGroup = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!existGroup) {
      throw new NotFoundException('Group not found with this id');
    }

    let dateFilter = {};
    if (year) {
      if (month) {
        if (day) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const startDate = new Date(year, month - 1, day, 0, 0, 0);
          const endDate = new Date(year, month - 1, day, 23, 59, 59);
          dateFilter = {
            OR: [
              { lessonDate: dateStr },
              {
                AND: [
                  { lessonDate: null },
                  {
                    created_at: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                ],
              },
            ],
          };
        } else {
          const prefix = `${year}-${String(month).padStart(2, '0')}-`;
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 1);
          dateFilter = {
            OR: [
              { lessonDate: { startsWith: prefix } },
              {
                AND: [
                  { lessonDate: null },
                  {
                    created_at: {
                      gte: startDate,
                      lt: endDate,
                    },
                  },
                ],
              },
            ],
          };
        }
      } else {
        const prefix = `${year}-`;
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);
        dateFilter = {
          OR: [
            { lessonDate: { startsWith: prefix } },
            {
              AND: [
                { lessonDate: null },
                {
                  created_at: {
                    gte: startDate,
                    lt: endDate,
                  },
                },
              ],
            },
          ],
        };
      }
    }

    const lessons = await this.prisma.lesson.findMany({
      where: {
        groupId,
        ...dateFilter,
      },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
          },
        },
        lessonVideo: {
          select: {
            id: true,
            title: true,
            file: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return {
      success: true,
      data: lessons,
    };
  }
}
