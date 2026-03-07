import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiCookieAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { multerConfig } from 'src/common/config/multer.config';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeachersService } from './teachers.service';
import type { Response } from 'express';
import { Roles } from 'src/common/decorators/role.decorator';

@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: "Yangi o'qituvchi qo'shish" })
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }


  @Get()
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINSTRATOR)
  @ApiOperation({ summary: "Barcha o'qituvchilarni ko'rish" })
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINSTRATOR)
  @ApiOperation({ summary: "O'qituvchini ID bo'yicha ko'rish (rating va guruhlar bilan)" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.findOne(id);
  }

  @Get(':id/groups')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINSTRATOR)
  @ApiOperation({ summary: "O'qituvchining guruhlari" })
  getGroups(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.getGroups(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: "O'qituvchi ma'lumotlarini yangilash" })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(id, dto);
  }

  @Patch(':id/photo')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @UseInterceptors(FileInterceptor('photo', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: "O'qituvchi rasmini yuklash" })
  uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.teachersService.updatePhoto(id, file.filename);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: "O'qituvchini o'chirish (status INACTIVE ga o'tadi)" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.remove(id);
  }
}