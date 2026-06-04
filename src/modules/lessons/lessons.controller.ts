import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Role } from '@prisma/client';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { SaveAttendanceDto } from './dto/save-attendance.dto';

@Controller('lessons')
@ApiCookieAuth('access_token')
export class LessonsController {
  constructor(private readonly lessonService: LessonsService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Guruh uchun yangi dars yaratish',
    description:
      'Muayyan guruh uchun yangi dars yaratadi.\n\n' +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  createLesson(@Body() payload: CreateLessonDto, @Req() req: RequestWithUser) {
    return this.lessonService.createLesson(payload, req.user);
  }

  @Post(':id/attendance')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'Dars davomatini saqlash',
    description:
      'Talabalarning darsga qatnashganligi yoki qatnashmaganligi (davomat) holatini saqlaydi.\n\n' +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`, `TEACHER`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: SaveAttendanceDto })
  saveAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveAttendanceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.lessonService.saveAttendance(id, dto, req.user);
  }

  @Get('by-date')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN, Role.TEACHER)
  @ApiOperation({
    summary:
      "Guruhning ma'lum bir yil, oy yoki kunga tegishli o'tilgan darslari",
    description:
      "Guruhning faqat o'tilgan (conducted) darslarini yil, oy va kun bo'yicha filterlab qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`, `TEACHER`',
  })
  @ApiQuery({
    name: 'groupId',
    required: true,
    type: Number,
    example: 1,
    description: 'Guruh ID raqami',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    example: 2026,
    description: 'Yil (masalan: 2026)',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    example: 5,
    description: 'Oy (1-12)',
  })
  @ApiQuery({
    name: 'day',
    required: false,
    type: Number,
    example: 17,
    description: 'Kun (1-31)',
  })
  getLessonsByDate(
    @Query('groupId', ParseIntPipe) groupId: number,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('day') day?: string,
  ) {
    return this.lessonService.getLessonsByDate(
      groupId,
      year ? +year : undefined,
      month ? +month : undefined,
      day ? +day : undefined,
    );
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Dars tafsilotlarini ko'rish",
    description:
      "Muayyan dars ma'lumotlarini uning unikal ID raqami bo'yicha qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lessonService.findOne(id);
  }

  @Get(':id/attendance')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: "Dars davomati ro'yxati",
    description:
      "Dars bo'yicha barcha talabalarning davomat natijalari ro'yxatini qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`, `TEACHER`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  getAttendance(@Param('id', ParseIntPipe) id: number) {
    return this.lessonService.getAttendance(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Darsni yangilash',
    description:
      'Dars mavzusi yoki boshqa dars tafsilotlarini yangilaydi.\n\n' +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLessonDto) {
    return this.lessonService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Darsni tizimdan o'chirish",
    description:
      "Darsni tizimdan butunlay o'chirib yuboradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lessonService.remove(id);
  }
}
