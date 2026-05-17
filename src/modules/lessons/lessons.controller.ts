import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Role } from '@prisma/client';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { SaveAttendanceDto } from './dto/save-attendance.dto';

@Controller('lessons')
@ApiCookieAuth("access_token")
export class LessonsController {
    constructor(private readonly lessonService: LessonsService) { }

    @Post()
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruh uchun yangi dars yaratish",
        description: "Muayyan guruh uchun yangi dars yaratadi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    createLesson(
        @Body() payload: CreateLessonDto,
        @Req() req: any
    ) {
        return this.lessonService.createLesson(payload, req["user"])
    }

    @Post(':id/attendance')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN, Role.TEACHER)
    @ApiOperation({
        summary: "Dars davomatini saqlash",
        description: "Talabalarning darsga qatnashganligi yoki qatnashmaganligi (davomat) holatini saqlaydi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`, `TEACHER`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiBody({ type: SaveAttendanceDto })
    saveAttendance(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: SaveAttendanceDto,
        @Req() req: any,
    ) {
        return this.lessonService.saveAttendance(id, dto, req['user']);
    }

    @Get(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Dars tafsilotlarini ko'rish",
        description: "Muayyan dars ma'lumotlarini uning unikal ID raqami bo'yicha qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.lessonService.findOne(id);
    }

    @Get(':id/attendance')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN, Role.TEACHER)
    @ApiOperation({
        summary: "Dars davomati ro'yxati",
        description: "Dars bo'yicha barcha talabalarning davomat natijalari ro'yxatini qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`, `TEACHER`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    getAttendance(@Param('id', ParseIntPipe) id: number) {
        return this.lessonService.getAttendance(id);
    }


    @Patch(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Darsni yangilash",
        description: "Dars mavzusi yoki boshqa dars tafsilotlarini yangilaydi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateLessonDto,
    ) {
        return this.lessonService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Darsni tizimdan o'chirish",
        description: "Darsni tizimdan butunlay o'chirib yuboradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.lessonService.remove(id);
    }
}
