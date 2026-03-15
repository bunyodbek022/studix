import {
    Body,
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
import {
    ApiBody,
    ApiConsumes,
    ApiCookieAuth,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';

import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { multerConfig } from 'src/common/config/multer.config';

@ApiTags('Students')
@Controller('students')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Post()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: "Yangi o'quvchi qo'shish" })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['fullName', 'email', 'password', 'birth_date'],
            properties: {
                fullName: { type: 'string', example: 'Dilnoza Yusupova' },
                email: { type: 'string', example: 'dilnoza@example.com' },
                password: { type: 'string', example: 'secret123' },
                birth_date: { type: 'string', example: '2000-05-20' },
                photo: { type: 'string', format: 'binary', nullable: true },
            },
        },
    })
    @UseInterceptors(FileInterceptor('photo', multerConfig))
    create(
        @Body() dto: CreateStudentDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.studentsService.create(dto, file);
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: "Barcha o'quvchilarni ko'rish" })
    findAll() {
        return this.studentsService.findAll();
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: "O'quvchini ID bo'yicha ko'rish (guruhlari bilan)" })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.findOne(id);
    }

    @Get(':id/group-summary')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({
        summary: 'Get student group summary',
        description:
            'Student detail sahifasidagi guruhlar jadvali uchun. ' +
            'Har bir guruh boyicha fan, oqituvchi, davomat, homework va dars sonini qaytaradi.',
    })
    @ApiParam({
        name: 'id',
        type: Number,
        description: 'Student ID',
        example: 1,
    })
    async getGroupSummary(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.getGroupSummary(id);
    }

    @Get(':id/groups')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: "O'quvchining guruhlari" })
    getGroups(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.getGroups(id);
    }

    @Get(':studentId/groups/:groupId/attendance-details')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({
        summary: 'Student davomat detallari',
        description: 'Berilgan guruh bo\'yicha studentning qoldirgan darslari ro\'yxati',
    })
    @ApiParam({ name: 'studentId', type: Number, example: 12 })
    @ApiParam({ name: 'groupId', type: Number, example: 2 })
    async getAttendanceDetails(
        @Param('studentId', ParseIntPipe) studentId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
    ) {
        return this.studentsService.getAttendanceDetails(studentId, groupId);
    }

    @Get(':studentId/groups/:groupId/homeworks')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({
        summary: 'Student vazifalar ro\'yxati',
        description: 'Berilgan guruh bo\'yicha studentning barcha vazifalari va natijalari',
    })
    @ApiParam({ name: 'studentId', type: Number, example: 12 })
    @ApiParam({ name: 'groupId', type: Number, example: 2 })
    async getHomeworks(
        @Param('studentId', ParseIntPipe) studentId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
    ) {
        return this.studentsService.getHomeworks(studentId, groupId);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: "O'quvchi ma'lumotlarini yangilash" })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                fullName: { type: 'string', example: 'Dilnoza Yusupova' },
                email: { type: 'string', example: 'dilnoza@example.com' },
                password: { type: 'string', example: 'secret123' },
                birth_date: { type: 'string', example: '2000-05-20' },
                photo: { type: 'string', format: 'binary', nullable: true },
            },
        },
    })
    @UseInterceptors(FileInterceptor('photo', multerConfig))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateStudentDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.studentsService.update(id, dto, file);
    }


    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({ summary: "O'quvchini o'chirish (status INACTIVE ga o'tadi)" })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.remove(id);
    }
}