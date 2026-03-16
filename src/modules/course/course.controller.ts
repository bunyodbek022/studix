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
    UseGuards,
} from '@nestjs/common';
import {
    ApiBody,
    ApiCookieAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FindAllCoursesDto } from './dto/find-all-courses.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';

@ApiTags('Courses')
@Controller('courses')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class CourseController {
    constructor(private readonly courseService: CourseService) { }

    @Post()
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Yangi kurs yaratish' })
    @ApiBody({ type: CreateCourseDto })
    create(@Body() dto: CreateCourseDto) {
        return this.courseService.create(dto);
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Barcha kurslar ro\'yxati' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'Node' })
    @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' })
    findAll(@Query() query: FindAllCoursesDto) {
        return this.courseService.findAll(query);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Kursni ID bo\'yicha ko\'rish' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.courseService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Kursni yangilash' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiBody({ type: UpdateCourseDto })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCourseDto,
    ) {
        return this.courseService.update(id, dto);
    }

    @Patch(':id/restore')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Kursni arxivdan qayta faollashtirish' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    restore(@Param('id', ParseIntPipe) id: number) {
        return this.courseService.restore(id);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Kursni o\'chirish (INACTIVE)' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.courseService.remove(id);
    }
}