import { Injectable, NotFoundException } from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateLessonVideoDto } from './dto/create-lesson-video.dto';
import { Role } from '@prisma/client';

@Injectable()
export class LessonVideosService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateLessonVideoDto, filename: string, currentUser: { id: number, role: Role }) {
        const existLesson = await this.prisma.lesson.findUnique({
            where: { id: dto.lessonId },
        })

        if (!existLesson) {
            throw new NotFoundException("Lesson not found with this id")
        }

        const video = await this.prisma.lessonVideo.create({
            data: {
                lessonId: dto.lessonId,
                title: dto.title,
                file: filename,
                teacherId: currentUser.role == Role.TEACHER ? currentUser.id : null,
                userId: currentUser.role != Role.TEACHER ? currentUser.id : null
            }
        })
        return { 
            success: true,
            message: "Lesson video uploaded successfully",
            data: video
        }
    }

    async remove(id: number) {
        const existVideo = await this.prisma.lessonVideo.findUnique({ where: { id } });
        if (!existVideo) {
            throw new NotFoundException("Lesson video not found");
        }

        await this.prisma.lessonVideo.delete({ where: { id } });

        return {
            success: true,
            message: "Lesson video deleted successfully"
        };
    }
}
