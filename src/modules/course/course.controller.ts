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
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FindAllCoursesDto } from './dto/find-all-courses.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';

@ApiTags('Courses')
@Controller('courses')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  @ApiOperation({
    summary: 'Yangi kurs yaratish',
    description:
      "Yangi kurs yaratadi. Nomi branch bo'yicha unikal bo'lishi lozim.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`',
  })
  @ApiBody({ type: CreateCourseDto })
  create(@Body() dto: CreateCourseDto, @Req() req: RequestWithUser) {
    return this.courseService.create(dto, req.user);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Barcha kurslar ro'yxati",
    description:
      'Tizimdagi barcha kurslarni sahifalab (pagination) va qidiruv (search) filtri bilan qaytaradi.\n\n' +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Node' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE'],
    example: 'ACTIVE',
  })
  @ApiQuery({ name: 'branchId', required: true, type: Number, example: 1 })
  findAll(@Query() query: FindAllCoursesDto, @Req() req: RequestWithUser) {
    return this.courseService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Kursni ID bo'yicha ko'rish",
    description:
      "Kurs ma'lumotlarini uning unikal ID raqami bo'yicha qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.courseService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  @ApiOperation({
    summary: 'Kursni yangilash',
    description:
      "Kurs ma'lumotlarini yangilaydi. Nom o'zgarsa, yangi nom unikal bo'lishi tekshiriladi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: UpdateCourseDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto) {
    return this.courseService.update(id, dto);
  }

  @Patch(':id/restore')
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  @ApiOperation({
    summary: 'Kursni arxivdan qayta faollashtirish',
    description:
      "Arxivlangan (INACTIVE) kurs statusini faol (ACTIVE) holatga o'tkazadi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.restore(id);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  @ApiOperation({
    summary: "Kursni o'chirish (Arxivlash)",
    description:
      "Kursni tizimdan o'chirmaydi, balki uning statusini INACTIVE (arxiv) holatga keltirib qo'yadi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.remove(id);
  }
}
