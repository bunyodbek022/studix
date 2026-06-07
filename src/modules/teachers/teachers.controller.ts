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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiCookieAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { multerConfig } from 'src/common/config/multer.config';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeachersService } from './teachers.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { FindAllTeachersDto } from './dto/find-all-teachers.dto';

@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Yangi o'qituvchi qo'shish",
    description:
      "Yangi o'qituvchi ma'lumotlarini tizimga kiritadi. Rasm yuklash (photo) va tajriba (experience) yillari kiritilishi shart.\n\n" +
      '**Ruxsat (Access):** Rollar: `CREATOR`, `ADMIN`',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'email', 'password', 'position', 'experience'],
      properties: {
        fullName: { type: 'string', example: 'Jasur Karimov' },
        email: { type: 'string', example: 'jasur@example.com' },
        password: { type: 'string', example: 'secret123' },
        position: { type: 'string', example: 'Backend Developer' },
        experience: { type: 'number', example: 3 },
        phone: { type: 'string', example: '+998901234567' },
        photo: { type: 'string', format: 'binary', nullable: true },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo', multerConfig))
  create(
    @Body() dto: CreateTeacherDto,
    @Req() req: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.teachersService.create(dto, req.user, file);
  }

  @Get()
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Barcha o'qituvchilarni ko'rish",
    description:
      "Tizimdagi barcha o'qituvchilar ro'yxatini qidiruv (search) va pagination bo'yicha sahifalab qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `CREATOR`, `ADMIN`',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Jasur' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, example: 1 })
  findAll(@Query() query: FindAllTeachersDto, @Req() req: RequestWithUser) {
    return this.teachersService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "O'qituvchini ID bo'yicha ko'rish",
    description:
      "Muayyan o'qituvchining shaxsiy ma'lumotlarini, rating ballarini va u o'tadigan faol guruhlarni uning ID raqami orqali qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `CREATOR`, `ADMIN`',
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.teachersService.findOne(id, req.user);
  }

  @Get(':id/groups')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "O'qituvchining guruhlari",
    description:
      "O'qituvchi dars beradigan barcha guruhlar ro'yxatini qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `CREATOR`, `ADMIN`',
  })
  getGroups(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.teachersService.getGroups(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "O'qituvchi ma'lumotlarini yangilash",
    description:
      "Mavjud o'qituvchining shaxsiy ma'lumotlarini (ismi, emaili, mutaxassisligi, tajribasi, telefoni, tug'ilgan kuni, rasmi) yangilaydi.\n\n" +
      '**Ruxsat (Access):** Rollar: `CREATOR`, `ADMIN`',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'Jasur Karimov' },
        email: { type: 'string', example: 'jasur@example.com' },
        password: { type: 'string', example: 'secret123' },
        position: { type: 'string', example: 'Backend Developer' },
        experience: { type: 'number', example: 3 },
        phone: { type: 'string', example: '+998901234567' },
        birth_date: { type: 'string', example: '2000-05-20' },
        photo: { type: 'string', format: 'binary', nullable: true },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo', multerConfig))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.teachersService.update(id, dto, file);
  }

  @Patch(':id/archive')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "O'qituvchini arxivga o'tkazish",
    description:
      "O'qituvchini arxiv (INACTIVE) holatiga o'tkazadi. Buning uchun uning hech qanday faol dars berayotgan guruhi bo'lmasligi shart.\n\n" +
      '**Ruxsat (Access):** Rollar: `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  archive(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.teachersService.archive(id, req.user);
  }

  @Patch(':id/restore')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "O'qituvchini arxivdan qayta faollashtirish",
    description:
      "Arxivlangan o'qituvchini faol (ACTIVE) holatga qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  restore(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.teachersService.restore(id, req.user);
  }

  @Delete(':id')
  @Roles(Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "O'qituvchini tizimdan o'chirish (DELETED)",
    description:
      "O'qituvchini tizimdan butunlay o'chirmaydi, balki statusini DELETED holatiga o'tkazib qo'yadi.\n\n" +
      '**Ruxsat (Access):** Rollar: `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.teachersService.remove(id, req.user);
  }
}
