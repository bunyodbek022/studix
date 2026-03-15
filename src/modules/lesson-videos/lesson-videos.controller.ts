import { Body, Controller, Delete, Param, ParseIntPipe, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { multerConfig } from 'src/common/config/multer.config';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { CreateLessonVideoDto } from './dto/create-lesson-video.dto';
import { LessonVideosService } from './lesson-videos.service';

@ApiTags('Lesson Videos')
@Controller('lesson-videos')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class LessonVideosController {
    constructor(private readonly lessonVideosService: LessonVideosService) {}

    @Post()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.TEACHER)
    @ApiOperation({ summary: "Dars uchun yangi video yuklash" })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file', multerConfig))
    @ApiBody({
        schema: {
            type: 'object',
            required: ['lessonId', 'title', 'file'],
            properties: {
                lessonId: { type: 'number', example: 1 },
                title: { type: 'string', example: '1-dars Kirish' },
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    create(
        @Body() dto: CreateLessonVideoDto,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
    ) {
        return this.lessonVideosService.create(dto, file?.filename, req['user']);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.TEACHER)
    @ApiOperation({ summary: "Lesson videoni o'chirish" })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.lessonVideosService.remove(id);
    }
}
