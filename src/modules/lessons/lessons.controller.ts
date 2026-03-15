import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Role } from '@prisma/client';
import { ApiCookieAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';

@Controller('lessons')
@ApiCookieAuth("access_token")
export class LessonsController {
    constructor(private readonly lessonService: LessonsService) { }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles("ADMIN", "SUPERADMIN","TEACHER")
    @Post()
    createLesson(
        @Body() payload: CreateLessonDto,
        @Req() req: Request
    ) {
        return this.lessonService.createLesson(payload, req["user"])
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Dars detayllari' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.lessonService.findOne(id);
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
