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

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles("ADMIN", "SUPERADMIN", "TEACHER")
    @Post()
    createLesson(
        @Body() payload: CreateLessonDto,
        @Req() req: Request
    ) {
        return this.lessonService.createLesson(payload, req["user"])
    }

    @Post(':id/attendance')
    @UseGuards(AuthGuard, RolesGuard)  // ← bu yo'q edi!
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR, Role.TEACHER)
    @ApiOperation({ summary: 'Dars davomatini saqlash' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiBody({ type: SaveAttendanceDto })
    saveAttendance(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: SaveAttendanceDto,
        @Req() req: Request,
    ) {
        return this.lessonService.saveAttendance(id, dto, req['user']);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Dars detayllari' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.lessonService.findOne(id);
    }

    @Get(':id/attendance')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR, Role.TEACHER)
    @ApiOperation({ summary: 'Dars davomati ro\'yxati' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    getAttendance(@Param('id', ParseIntPipe) id: number) {
        return this.lessonService.getAttendance(id);
    }


    @Patch(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Darsni yangilash' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateLessonDto,
    ) {
        return this.lessonService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Darsni o\'chirish' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.lessonService.remove(id);
    }
}
