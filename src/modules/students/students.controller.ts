import {
  Body,
  Res,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiCookieAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { multerConfig } from 'src/common/config/multer.config';
import { Roles } from 'src/common/decorators/role.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@ApiTags('Students')
@Controller('students')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINSTRATOR)
  @ApiOperation({ summary: "Yangi o'quvchi qo'shish" })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }


  @Get()
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINSTRATOR)
  @ApiOperation({ summary: "Barcha o'quvchilarni ko'rish" })
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINSTRATOR)
  @ApiOperation({ summary: "O'quvchini ID bo'yicha ko'rish (guruhlari bilan)" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Get(':id/groups')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINSTRATOR)
  @ApiOperation({ summary: "O'quvchining guruhlari" })
  getGroups(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.getGroups(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINSTRATOR)
  @ApiOperation({ summary: "O'quvchi ma'lumotlarini yangilash" })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Patch(':id/photo')
  @Roles(Role.ADMIN, Role.SUPERADMIN,Role.STUDENT)
  @UseInterceptors(FileInterceptor('photo', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: "O'quvchi rasmini yuklash" })
  uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.studentsService.updatePhoto(id, file.filename);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: "O'quvchini o'chirish (status INACTIVE ga o'tadi)" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}