import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCookieAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '@prisma/client';
import { MakePaymentDto } from './dto/make-payment.dto';
import { FindDebtorsDto } from './dto/find-debtors.dto';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@ApiTags('Payments & Billing')
@Controller('payments')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Get('debtors')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Qarzdor studentlar ro'yxati",
    description:
      "Manfiy balansga ega bo'lgan barcha to'lov yozuvlarini qaytaradi.\n\n" +
      '**Default holat:** eng oxirgi yangilangan qarzdorlik birinchi chiqadi (`sortBy=updatedAt&sortOrder=desc`).\n\n' +
      '**Javob tarkibi:**\n' +
      "- `data` — filtrlangan qarzdorlar ro'yxati\n" +
      "- `summary.totalDebt` — branchdagi umumiy qarz (manfiy balanslar yig'indisi)\n" +
      "- `summary.filteredTotal` — joriy filter bo'yicha qarz yig'indisi\n" +
      "- `latestHistory` — o'sha payment uchun eng oxirgi yozilgan tarix\n\n" +
      '**Ruxsat:** `CREATOR`, `ADMIN`',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: "Ism yoki telefon bo'yicha qidiruv" })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'FREEZE', 'INACTIVE', 'PROBATION', 'DELETED', 'ALL'],
    example: 'ACTIVE',
    description: 'StudentGroup holati (default: ACTIVE)',
  })
  @ApiQuery({ name: 'groupStatus', required: false, enum: ['ACTIVE', 'INACTIVE', 'FREEZE', 'DELETED', 'PROBATION'] })
  @ApiQuery({ name: 'groupId', required: false, type: Number })
  @ApiQuery({ name: 'minAmount', required: false, type: Number, description: "Minimum qarz (musbat son, so'mda)" })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number, description: "Maksimum qarz (musbat son, so'mda)" })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, example: '2026-12-31' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['amount', 'createdAt', 'updatedAt', 'studentName'],
    example: 'updatedAt',
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  findDebtors(@Query() query: FindDebtorsDto, @Req() req: RequestWithUser) {
    return this.paymentsService.findDebtors(query, req.user);
  }

  @Post('student-groups/:id/approve-trial')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Talabani sinov (PROBATION) dan rasman qabul qilish',
    description:
      "Talaba qabul qilinganda uning `paymentStartDate` sanasidan joriy oy oxirigacha proporsional qarz yoziladi.\n\n**Ruxsat:** `CREATOR`, `ADMIN`",
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({
    schema: {
      properties: {
        paymentStartDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-06-08T00:00:00.000Z',
        },
      },
    },
  })
  approveTrial(
    @Param('id', ParseIntPipe) id: number,
    @Body('paymentStartDate') paymentStartDate: string,
  ) {
    return this.paymentsService.approveTrial(id, new Date(paymentStartDate));
  }

  @Post('student-groups/:id/exit')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Talabani guruhdan chiqarish va qarzini qayta hisoblash',
    description:
      "Talaba chiqqan sanadan oy oxirigacha o'qilmagan darslar uchun qarz bekor qilinadi (Refund).\n\n**Ruxsat:** `CREATOR`, `ADMIN`",
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({
    schema: {
      properties: {
        exitDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-06-20T00:00:00.000Z',
        },
      },
    },
  })
  exitGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body('exitDate') exitDate: string,
  ) {
    return this.paymentsService.exitGroup(id, new Date(exitDate));
  }

  @Post('student-groups/:id/pay')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Talabadan to'lov qabul qilish",
    description:
      "Muayyan oy uchun talabadan to'lov qabul qilinadi. Balans yangilanib, tarixga yozib qo'yiladi.\n\n**Ruxsat:** `CREATOR`, `ADMIN`",
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: MakePaymentDto })
  makePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MakePaymentDto,
  ) {
    return this.paymentsService.makePayment(id, dto.amount, dto.month, dto.year);
  }
}
