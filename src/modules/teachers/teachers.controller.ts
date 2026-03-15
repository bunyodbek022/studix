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
    Res,
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
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { multerConfig } from 'src/common/config/multer.config';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeachersService } from './teachers.service';
import type { Response } from 'express';
import { Roles } from 'src/common/decorators/role.decorator';
import { FindAllTeachersDto } from './dto/find-all-teachers.dto';

@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class TeachersController {
    constructor(private readonly teachersService: TeachersService) { }

    @Post()
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: "Yangi o'qituvchi qo'shish" })
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
                photo: { type: 'string', format: 'binary', nullable: true },
            },
        },
    })
    @UseInterceptors(FileInterceptor('photo', multerConfig))
    create(
        @Body() dto: CreateTeacherDto,
        @Req() req: any,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const userId = req.user?.id;
        return this.teachersService.create(dto, userId, file);
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: "Barcha o'qituvchilarni ko'rish" })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'Jasur' })
    findAll(@Query() query: FindAllTeachersDto) {
        return this.teachersService.findAll(query);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({
        summary: "O'qituvchini ID bo'yicha ko'rish (rating va guruhlar bilan)",
    })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.teachersService.findOne(id);
    }

    @Get(':id/groups')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: "O'qituvchining guruhlari" })
    getGroups(@Param('id', ParseIntPipe) id: number) {
        return this.teachersService.getGroups(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: "O'qituvchi ma'lumotlarini yangilash" })
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeacherDto) {
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
    @ApiOperation({
        summary: "O'qituvchini o'chirish (status INACTIVE ga o'tadi)",
    })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.teachersService.remove(id);
    }
}
