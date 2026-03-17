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
    ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
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
        @Req() req: Request,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.teachersService.create(dto, req['user'], file);
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: "Barcha o'qituvchilarni ko'rish" })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'Jasur' })
    @ApiQuery({ name: 'courseId', required: false, type: Number, example: 1 })
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
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: "O'qituvchi ma'lumotlarini yangilash" })
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
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({
        summary: "O'qituvchini arxivga o'tkazish",
        description: "Faqat aktiv guruhlari bo'lmagan teacher arxivga o'tkaziladi",
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    archive(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
        return this.teachersService.archive(id, req['user']);
    }

    @Patch(':id/restore')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: "O'qituvchini arxivdan qayta faollashtirish" })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    restore(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
        return this.teachersService.restore(id, req['user']);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: "O'qituvchini o'chirish (DELETED)" })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
        return this.teachersService.remove(id, req['user']);
    }
}
