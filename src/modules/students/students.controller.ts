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
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FreezeStudentDto } from './dto/freeze-student.dto';
import { UnfreezeStudentDto } from './dto/unfreeze-student.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { RequirePermission } from 'src/common/decorators/permission.decorator';
import { PermissionsGuard } from 'src/common/guards/permission.guard';
import { Label, RoleActions } from '@prisma/client';
import { multerConfig } from 'src/common/config/multer.config';

@ApiTags('Students')
@Controller('students')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Post()
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @RequirePermission(Label.STUDENTS, RoleActions.CREATE)
    @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
    @ApiOperation({
        summary: "Yangi o'quvchi qo'shish",
        description:
            "Yangi talaba (o'quvchi) yaratadi va tizimga qo'shadi. Rasm yuklash (photo) va branchId yozish imkoniyati bor.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`\n' +
            '**Ruxsatlar (Permissions):** Label: `STUDENTS`, Action: `CREATE`',
    })
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
                branchId: { type: 'number', example: 1 },
            },
        },
    })
    @UseInterceptors(FileInterceptor('photo', multerConfig))
    create(
        @Body() dto: CreateStudentDto,
        @Req() req: RequestWithUser,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.studentsService.create(dto, file, req.user);
    }

    @Get()
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @RequirePermission(Label.STUDENTS, RoleActions.READ)
    @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
    @ApiOperation({
        summary: "Barcha o'quvchilarni ko'rish",
        description:
            "Tizimdagi barcha faol o'quvchilar ro'yxatini qaytaradi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`\n' +
            '**Ruxsatlar (Permissions):** Label: `STUDENTS`, Action: `READ`',
    })
    findAll(@Req() req: RequestWithUser) {
        return this.studentsService.findAll(req.user);
    }

    @Get('my/groups')
    @Roles(Role.STUDENT)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({
        summary: "Studentning o'z guruhlari",
        description: "Student o'zi a'zo bo'lgan guruhlarni ko'rishi uchun.",
    })
    getMyGroups(
        @Req() req: RequestWithUser,
        @Query() query: { page?: string; limit?: string; search?: string; tab?: string; courseId?: string },
    ) {
        return this.studentsService.getMyGroupsPaginated(req.user.id, query);
    }

    @Get('dashboard')
    @Roles(Role.STUDENT)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({
        summary: "Student dashboard statistikasi",
        description: "Studentning umumiy xp, coins, davomat va oxirgi faolliklarini qaytaradi.",
    })
    getStudentDashboard(@Req() req: RequestWithUser) {
        return this.studentsService.getStudentDashboard(req.user);
    }

    @Get('group-calendar')
    @Roles(Role.STUDENT)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({
        summary: "Studentning ma'lum bir guruh uchun dars kalendari",
        description: "Tanlangan guruhning oylik dars jadvalini qaytaradi.",
    })
    @ApiQuery({ name: 'groupId', required: true, type: Number })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: false, type: Number })
    getGroupCalendar(
        @Req() req: RequestWithUser,
        @Query('groupId', ParseIntPipe) groupId: number,
        @Query('month', ParseIntPipe) month: number,
        @Query('year') year?: string,
    ) {
        return this.studentsService.getGroupCalendar(req.user.id, groupId, month, year ? +year : undefined);
    }

    @Get('rating')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.STUDENT)
    @ApiOperation({
        summary: "Studentlarning XP bo'yicha reytingi",
        description: "Studentlarni guruh, filial yoki butun markaz bo'yicha filter qilib reytingini ko'rsatish.",
    })
    @ApiQuery({ name: 'type', enum: ['GROUP', 'BRANCH', 'CENTER'], required: true })
    @ApiQuery({ name: 'groupId', required: false, type: Number })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    getStudentRating(
        @Req() req: RequestWithUser,
        @Query() query: { type: 'GROUP' | 'BRANCH' | 'CENTER'; groupId?: string; page?: string; limit?: string; search?: string },
    ) {
        return this.studentsService.getStudentRating(req.user, query);
    }

    @Get(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @RequirePermission(Label.STUDENTS, RoleActions.READ)
    @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
    @ApiOperation({
        summary: "O'quvchini ID bo'yicha ko'rish",
        description:
            "O'quvchining shaxsiy ma'lumotlarini va u a'zo bo'lgan guruhlarni uning ID raqami orqali qaytaradi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`\n' +
            '**Ruxsatlar (Permissions):** Label: `STUDENTS`, Action: `READ`',
    })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.findOne(id);
    }

    @Get(':id/group-summary')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({
        summary: "O'quvchining guruhlardagi umumiy faoliyati",
        description:
            "O'quvchining detail sahifasidagi guruhlar jadvali uchun har bir guruh bo'yicha fan, o'qituvchi, davomat foizi, vazifalar (homework) va darslar sonini qaytaradi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
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
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({
        summary: "O'quvchi a'zo bo'lgan guruhlar",
        description:
            "Berilgan o'quvchi biriktirilgan barcha guruhlar ro'yxatini qaytaradi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
    })
    getGroups(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.getGroups(id);
    }

    @Get('my/groups/:groupId/attendance')
    @Roles(Role.STUDENT)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({
        summary: "Studentning o'z guruhidagi davomati",
        description: "Student o'zining qoldirgan darslari ro'yxatini ko'rishi uchun.",
    })
    @ApiParam({ name: 'groupId', type: Number, example: 2 })
    async getMyAttendanceDetails(
        @Req() req: RequestWithUser,
        @Param('groupId', ParseIntPipe) groupId: number,
    ) {
        return this.studentsService.getMyAttendanceHistory(req.user.id, groupId);
    }

    @Get(':studentId/groups/:groupId/attendance-details')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "O'quvchi davomat detallari",
        description:
            "Berilgan guruh bo'yicha o'quvchining qoldirgan darslari va sababli/sababsiz davomat ma'lumotlari ro'yxatini qaytaradi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
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
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "O'quvchining vazifalar (homework) ro'yxati",
        description:
            "Berilgan guruh bo'yicha o'quvchining barcha uy vazifalari, topshiriq topshirganlik holati va baholari/natijalari ro'yxatini qaytaradi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
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
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiOperation({
        summary: "O'quvchi ma'lumotlarini yangilash",
        description:
            "O'quvchining shaxsiy ma'lumotlarini (ismi, emaili, paroli, tug'ilgan kuni, rasmi) yangilaydi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
    })
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

    @Patch(':id/archive')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Studentni arxivga o'tkazish",
        description:
            "O'quvchini arxiv (INACTIVE) holatiga o'tkazadi va uning guruhlardagi statusini ham INACTIVE qiladi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    archive(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.archive(id);
    }

    @Patch(':id/restore')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: 'Studentni arxivdan qayta faollashtirish',
        description:
            "Arxivlangan o'quvchini faol (ACTIVE) holatga qaytaradi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    restore(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.restore(id);
    }

    @Patch(':id/freeze')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: 'Studentni freeze qilish (barcha guruhlarida)',
        description:
            "Studentni FREEZE holatiga o'tkazadi. Studentning o'z statusi va u a'zo bo'lgan barcha ACTIVE guruhlardagi statusi FREEZE bo'ladi.\n\n" +
            '**Muhim:** Freeze tugash sanasi (`freezeEndDate`) kelganda tizim avtomatik student va guruhlarni ACTIVE ga qaytaradi.\n\n' +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
    })
    @ApiParam({ name: 'id', type: Number, example: 1, description: 'Student ID' })
    @ApiBody({ type: FreezeStudentDto })
    freeze(@Param('id', ParseIntPipe) id: number, @Body() dto: FreezeStudentDto) {
        return this.studentsService.freezeStudent(id, dto);
    }

    @Patch(':id/unfreeze')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: 'Studentni freeze dan chiqarish',
        description:
            "FREEZE holatidagi studentni ACTIVE ga qaytaradi. Barcha freeze guruhlaridagi statusi ham ACTIVE bo'ladi.\n\n" +
            "**Erta chiqarish:** `unfrozenAt` sanasi berilsa, o'sha sana saqlanadi. Berilmasa bugungi sana ishlatiladi. " +
            "Freeze boshlangandan `unfrozenAt` gacha bo'lgan davrda attendance kiritish imkoni qoladi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
    })
    @ApiParam({ name: 'id', type: Number, example: 1, description: 'Student ID' })
    @ApiBody({ type: UnfreezeStudentDto })
    unfreeze(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UnfreezeStudentDto,
    ) {
        return this.studentsService.unfreezeStudent(id, dto);
    }

    @Delete(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Studentni butunlay o'chirish (DELETED)",
        description:
            "O'quvchini tizimdan butunlay o'chirmaydi, balki statusini DELETED holatiga o'tkazib qo'yadi.\n\n" +
            '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.studentsService.remove(id);
    }
}
