import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { Role } from '@prisma/client';
import { ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';

@Controller('lessons')
@ApiCookieAuth("access_token")
export class LessonsController {
    constructor(private readonly lessonServise: LessonsService) { }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles("ADMIN", "SUPERADMIN","TEACHER")
    @Post()
    createStudentGroup(
        @Body() payload: CreateLessonDto,
        @Req() req: Request
    ) {
        return this.lessonServise.createLesson(payload, req["user"])
    }
}
