import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/role.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('course')
@ApiBearerAuth()
export class CourseController {
    constructor(private readonly courseService: CourseService) { }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @Get("all")
    getAllCourse() {
        return this.courseService.getAllCourse()
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @Post()
    createCourse(@Body() payload: CreateCourseDto) {
        return this.courseService.createCourse(payload)
    }
}
