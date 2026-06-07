import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import PrismaService from 'src/prisma/prisma.service';
import { PaymentAction, Prisma, Status } from '@prisma/client';
import { FindDebtorsDto } from './dto/find-debtors.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getDayIndex(day: string): number {
    const map: Record<string, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };
    return map[day];
  }

  /** Berilgan sana oralig'ida guruhda nechta dars bo'lishini hisoblaydi */
  public calculateLessonsCount(
    startDate: Date,
    endDate: Date,
    weekDays: string[],
  ): number {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const validDays = weekDays.map((d) => this.getDayIndex(d));

    while (current <= end) {
      if (validDays.includes(current.getDay())) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  @Cron('0 0 1 * *', { timeZone: 'Asia/Tashkent' })
  async addMonthlyDebts() {
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }),
    );
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    this.logger.log(
      `Oylik qarz yozish boshlandi: ${year}-${String(month).padStart(2, '0')}`,
    );

    const studentGroups = await this.prisma.studentGroup.findMany({
      where: { status: { in: [Status.ACTIVE, Status.FREEZE] } },
      include: {
        group: { include: { course: true } },
      },
    });

    for (const sg of studentGroups) {
      try {
        const amount = -Number(sg.group.course.price);

        await this.prisma.payment.upsert({
          where: {
            studentId_groupId_month_year: {
              studentId: sg.studentId,
              groupId: sg.groupId,
              month,
              year,
            },
          },
          update: { amount: { increment: amount } },
          create: {
            branchId: sg.branchId,
            studentId: sg.studentId,
            groupId: sg.groupId,
            month,
            year,
            amount,
          },
        });

        await this.prisma.paymentHistory.create({
          data: {
            branchId: sg.branchId,
            studentId: sg.studentId,
            groupId: sg.groupId,
            month,
            year,
            action: PaymentAction.MONTHLY_DEBT,
            amount,
            description: `${year}-${String(month).padStart(2, '0')} oylik to'lov qarzi (avtomatik)`,
          },
        });
      } catch (err) {
        this.logger.error(`Xatolik: StudentGroup ID: ${sg.id}`, err);
      }
    }

    this.logger.log('Oylik qarz yozish yakunlandi.');
  }

  async approveTrial(studentGroupId: number, paymentStartDate: Date) {
    const sg = await this.prisma.studentGroup.findUnique({
      where: { id: studentGroupId },
      include: { group: { include: { course: true } } },
    });

    if (!sg) throw new NotFoundException('StudentGroup topilmadi');
    if (sg.status !== Status.PROBATION) {
      throw new BadRequestException('Talaba sinov (PROBATION) muddatida emas');
    }

    const start = new Date(paymentStartDate);
    const month = start.getMonth() + 1;
    const year = start.getFullYear();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const totalLessonsInMonth = this.calculateLessonsCount(
      monthStart,
      monthEnd,
      sg.group.weekDays,
    );
    const remainingLessons = this.calculateLessonsCount(
      start,
      monthEnd,
      sg.group.weekDays,
    );

    let amount = 0;
    if (totalLessonsInMonth > 0) {
      const pricePerLesson =
        Number(sg.group.course.price) / totalLessonsInMonth;
      amount = -(pricePerLesson * remainingLessons);
    }

    const roundedAmount = Math.round(amount);

    return await this.prisma.$transaction(async (tx) => {
      const updatedSg = await tx.studentGroup.update({
        where: { id: studentGroupId },
        data: { status: Status.ACTIVE, paymentStartDate: start },
      });

      if (roundedAmount < 0) {
        await tx.payment.upsert({
          where: {
            studentId_groupId_month_year: {
              studentId: sg.studentId,
              groupId: sg.groupId,
              month,
              year,
            },
          },
          update: { amount: { increment: roundedAmount } },
          create: {
            branchId: sg.branchId,
            studentId: sg.studentId,
            groupId: sg.groupId,
            month,
            year,
            amount: roundedAmount,
          },
        });

        await tx.paymentHistory.create({
          data: {
            branchId: sg.branchId,
            studentId: sg.studentId,
            groupId: sg.groupId,
            month,
            year,
            action: PaymentAction.TRIAL_APPROVED,
            amount: roundedAmount,
            description: `Sinovdan o'tdi. ${year}-${String(month).padStart(2, '0')}: qolgan ${remainingLessons} ta dars uchun proporsional qarz.`,
          },
        });
      }

      return {
        success: true,
        studentGroup: updatedSg,
        billing: {
          month,
          year,
          totalLessonsInMonth,
          remainingLessons,
          calculatedDebt: roundedAmount,
        },
      };
    });
  }

  async exitGroup(studentGroupId: number, exitDate: Date) {
    const sg = await this.prisma.studentGroup.findUnique({
      where: { id: studentGroupId },
      include: { group: { include: { course: true } } },
    });

    if (!sg) throw new NotFoundException('StudentGroup topilmadi');
    if (
      sg.status === Status.INACTIVE ||
      sg.status === Status.DELETED ||
      sg.status === Status.PROBATION
    ) {
      throw new BadRequestException(
        "Talabani bu statusdan guruhdan chiqarib bo'lmaydi",
      );
    }

    const exit = new Date(exitDate);
    const month = exit.getMonth() + 1;
    const year = exit.getFullYear();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const totalLessonsInMonth = this.calculateLessonsCount(
      monthStart,
      monthEnd,
      sg.group.weekDays,
    );
    const missedLessons = this.calculateLessonsCount(
      exit,
      monthEnd,
      sg.group.weekDays,
    );

    let refundAmount = 0;
    if (totalLessonsInMonth > 0 && missedLessons > 0) {
      const pricePerLesson =
        Number(sg.group.course.price) / totalLessonsInMonth;
      refundAmount = pricePerLesson * missedLessons;
    }

    const roundedRefund = Math.round(refundAmount);

    return await this.prisma.$transaction(async (tx) => {
      const updatedSg = await tx.studentGroup.update({
        where: { id: studentGroupId },
        data: { status: Status.INACTIVE, exitDate: exit },
      });

      if (roundedRefund > 0) {
        await tx.payment.upsert({
          where: {
            studentId_groupId_month_year: {
              studentId: sg.studentId,
              groupId: sg.groupId,
              month,
              year,
            },
          },
          update: { amount: { increment: roundedRefund } },
          create: {
            branchId: sg.branchId,
            studentId: sg.studentId,
            groupId: sg.groupId,
            month,
            year,
            amount: roundedRefund,
          },
        });

        await tx.paymentHistory.create({
          data: {
            branchId: sg.branchId,
            studentId: sg.studentId,
            groupId: sg.groupId,
            month,
            year,
            action: PaymentAction.GROUP_EXIT,
            amount: roundedRefund,
            description: `Guruhdan chiqdi. ${year}-${String(month).padStart(2, '0')}: ${missedLessons} ta o'qilmagan dars uchun qarz bekor qilindi (refund).`,
          },
        });
      }

      return {
        success: true,
        studentGroup: updatedSg,
        billing: {
          month,
          year,
          totalLessonsInMonth,
          missedLessons,
          refundedAmount: roundedRefund,
        },
      };
    });
  }

  async makePayment(
    studentGroupId: number,
    amount: number,
    month: number,
    year: number,
  ) {
    if (amount <= 0) {
      throw new BadRequestException("To'lov summasi musbat bo'lishi kerak");
    }

    const sg = await this.prisma.studentGroup.findUnique({
      where: { id: studentGroupId },
    });

    if (!sg) throw new NotFoundException('StudentGroup topilmadi');

    return await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: {
          studentId_groupId_month_year: {
            studentId: sg.studentId,
            groupId: sg.groupId,
            month,
            year,
          },
        },
        update: { amount: { increment: amount } },
        create: {
          branchId: sg.branchId,
          studentId: sg.studentId,
          groupId: sg.groupId,
          month,
          year,
          amount,
        },
      });

      await tx.paymentHistory.create({
        data: {
          branchId: sg.branchId,
          studentId: sg.studentId,
          groupId: sg.groupId,
          month,
          year,
          action: 'PAYMENT',
          amount,
          description: `${year}-${String(month).padStart(2, '0')} uchun ${amount.toLocaleString()} so'm to'lov qilindi`,
        },
      });

      return {
        success: true,
        payment,
        currentBalance: Number(payment.amount),
      };
    });
  }

  // ─── Qarzdor studentlar ro'yxati ────────────────────────────────────────────

  async findDebtors(
    dto: FindDebtorsDto,
    currentUser: { branchId?: number },
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      status = 'ACTIVE',
      groupStatus,
      groupId,
      minAmount,
      maxAmount,
      dateFrom,
      dateTo,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = dto;

    const skip = (page - 1) * limit;
    const branchId = currentUser.branchId;

    // StudentGroup holati bo'yicha mos keluvchi (studentId, groupId) juftliklarini olish
    let allowedPairs: { studentId: number; groupId: number }[] | null = null;
    if (status !== 'ALL') {
      allowedPairs = await this.prisma.studentGroup.findMany({
        where: {
          ...(branchId && { branchId }),
          status: status as Status,
          ...(groupId && { groupId }),
          ...(groupStatus && { group: { status: groupStatus } }),
        },
        select: { studentId: true, groupId: true },
      });

      if (allowedPairs.length === 0) {
        return {
          success: true,
          data: [],
          summary: { totalDebt: 0, filteredTotal: 0 },
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
    }

    // Amount filter: foydalanuvchi musbat son kiritadi, biz manfiyga aylantirамiz
    const amountFilter: Prisma.DecimalFilter = { lt: 0 };
    if (minAmount !== undefined) amountFilter.lte = -Math.abs(minAmount);
    if (maxAmount !== undefined) amountFilter.gte = -Math.abs(maxAmount);

    // Asosiy where sharti
    const where: Prisma.PaymentWhereInput = {
      ...(branchId && { branchId }),
      amount: amountFilter,
      ...(search && {
        student: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        },
      }),
      ...(groupId && status === 'ALL' && { groupId }),
      ...(groupStatus && status === 'ALL' && { group: { status: groupStatus } }),
      ...(allowedPairs && {
        OR: allowedPairs.map((sg) => ({
          studentId: sg.studentId,
          groupId: sg.groupId,
        })),
      }),
      ...((dateFrom || dateTo) && {
        updated_at: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) }),
        },
      }),
    };

    // Saralash
    const orderByMap: Record<string, Prisma.PaymentOrderByWithRelationInput> = {
      updatedAt: { updated_at: sortOrder },
      createdAt: { created_at: sortOrder },
      amount: { amount: sortOrder },
      studentName: { student: { fullName: sortOrder } },
    };
    const orderBy = orderByMap[sortBy] ?? { updated_at: 'desc' };

    // Umumiy qarz (branchdagi barcha manfiy to'lovlar yig'indisi)
    const [payments, total, totalDebtAgg, filteredTotalAgg] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where,
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                photo: true,
                status: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
                status: true,
                course: { select: { id: true, name: true, level: true } },
                teacher: { select: { id: true, fullName: true } },
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.payment.count({ where }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            ...(branchId && { branchId }),
            amount: { lt: 0 },
          },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where,
        }),
      ]);

    // Har bir payment uchun eng oxirgi PaymentHistory yozuvini olish (batch)
    const latestHistories = payments.length > 0
      ? await this.prisma.paymentHistory.findMany({
          where: {
            OR: payments.map((p) => ({
              studentId: p.studentId,
              groupId: p.groupId,
              month: p.month,
              year: p.year,
            })),
          },
          orderBy: { created_at: 'desc' },
        })
      : [];

    const historyMap = new Map<string, (typeof latestHistories)[0]>();
    for (const h of latestHistories) {
      const key = `${h.studentId}_${h.groupId}_${h.month}_${h.year}`;
      if (!historyMap.has(key)) {
        historyMap.set(key, h);
      }
    }

    const data = payments.map((p) => {
      const key = `${p.studentId}_${p.groupId}_${p.month}_${p.year}`;
      const latestHistory = historyMap.get(key);
      return {
        id: p.id,
        month: p.month,
        year: p.year,
        balance: Number(p.amount),
        created_at: p.created_at,
        updated_at: p.updated_at,
        student: p.student,
        group: p.group,
        latestHistory: latestHistory
          ? {
              action: latestHistory.action,
              description: latestHistory.description,
              created_at: latestHistory.created_at,
            }
          : null,
      };
    });

    return {
      success: true,
      data,
      summary: {
        totalDebt: Math.abs(Number(totalDebtAgg._sum.amount ?? 0)),
        filteredTotal: Math.abs(Number(filteredTotalAgg._sum.amount ?? 0)),
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
