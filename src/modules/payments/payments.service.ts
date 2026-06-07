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
import { TokenPayload } from 'src/common/interfaces/request-with-user.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) { }

  // ─── Yordamchi funksiyalar ──────────────────────────────────────────────────

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


  // ─── Qarzdorlar ro'yxati ────────────────────────────────────────────────────

  async findDebtors(dto: FindDebtorsDto, user: TokenPayload) {
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

    // Build Payment where clause — only negative balances in the user's branch
    const paymentWhere: Prisma.PaymentWhereInput = {
      branchId: user.branchId,
      amount: { lt: 0 },
    };

    // Amount range filter (DTO values are positive, DB amounts are negative)
    if (minAmount !== undefined) {
      paymentWhere.amount = {
        ...(paymentWhere.amount as object),
        lte: -minAmount,
      };
    }
    if (maxAmount !== undefined) {
      paymentWhere.amount = {
        ...(paymentWhere.amount as object),
        gte: -maxAmount,
      };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      paymentWhere.updated_at = {};
      if (dateFrom) paymentWhere.updated_at.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        paymentWhere.updated_at.lte = end;
      }
    }

    // Group filter
    if (groupId) paymentWhere.groupId = groupId;

    // StudentGroup status filter
    if (status !== 'ALL') {
      paymentWhere.student = {
        StudentGroups: {
          some: {
            groupId: groupId,
            status: status as Status,
          },
        },
      };
    }

    // Group status filter
    if (groupStatus) {
      paymentWhere.group = { status: groupStatus };
    }

    // Search by student name or phone
    if (search) {
      paymentWhere.student = {
        ...(paymentWhere.student as object),
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Sorting
    let orderBy: Prisma.PaymentOrderByWithRelationInput;
    if (sortBy === 'studentName') {
      orderBy = { student: { fullName: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [payments, totalCount, branchAggregate] = await Promise.all([
      this.prisma.payment.findMany({
        where: paymentWhere,
        orderBy,
        skip,
        take: limit,
        include: {
          student: { select: { id: true, fullName: true, phone: true, photo: true } },
          group: { select: { id: true, name: true, status: true } },
          // Latest history entry for each payment
        },
      }),
      this.prisma.payment.count({ where: paymentWhere }),
      // Total debt across the whole branch (not just this page)
      this.prisma.payment.aggregate({
        where: { branchId: user.branchId, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    // Filtered total (current filter, all pages)
    const filteredAggregate = await this.prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
    });

    // Attach the latest PaymentHistory entry for each payment
    const latestHistories = await this.prisma.paymentHistory.findMany({
      where: {
        studentId: { in: payments.map((p) => p.studentId) },
        groupId: { in: payments.map((p) => p.groupId) },
        branchId: user.branchId,
      },
      orderBy: { created_at: 'desc' },
    });

    // Map: "studentId-groupId" -> latest history
    const historyMap = new Map<string, typeof latestHistories[0]>();
    for (const h of latestHistories) {
      const key = `${h.studentId}-${h.groupId}`;
      if (!historyMap.has(key)) historyMap.set(key, h);
    }

    const data = payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      latestHistory: historyMap.get(`${p.studentId}-${p.groupId}`) ?? null,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalDebt: Number(branchAggregate._sum.amount ?? 0),
        filteredTotal: Number(filteredAggregate._sum.amount ?? 0),
      },
    };
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

  // ─── Sinovdan qabul qilish (Approve Trial) ─────────────────────────────────

  async approveTrial(studentGroupId: number, paymentStartDate: Date) {
    const sg = await this.prisma.studentGroup.findUnique({
      where: { id: studentGroupId },
      include: { group: { include: { course: true } } },
    });

    if (!sg) throw new NotFoundException('StudentGroup topilmadi');
    if (sg.status !== Status.PROBATION) {
      throw new BadRequestException(
        'Talaba sinov (PROBATION) muddatida emas',
      );
    }

    const start = new Date(paymentStartDate);
    const month = start.getMonth() + 1;
    const year = start.getFullYear();

    // Oy boshidan oxirigacha bo'lgan jami darslar
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
      amount = -(pricePerLesson * remainingLessons); // Manfiy = qarz
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

  // ─── Guruhdan chiqarish (Exit Group + Refund) ───────────────────────────────

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
        'Talabani bu statusdan guruhdan chiqarib bo\'lmaydi',
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
    // exitDate dan keyin bo'ladigan (qatnashilmaydigan) darslar
    const missedLessons = this.calculateLessonsCount(
      exit,
      monthEnd,
      sg.group.weekDays,
    );

    let refundAmount = 0;
    if (totalLessonsInMonth > 0 && missedLessons > 0) {
      const pricePerLesson =
        Number(sg.group.course.price) / totalLessonsInMonth;
      refundAmount = pricePerLesson * missedLessons; // Musbat = qarzni kamaytiradi
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

  // ─── To'lov qilish ──────────────────────────────────────────────────────────

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
      // Payment balance ni yangilash (musbat qo'shish)
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

      // Tarixga yozish
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
}
