import { Injectable, NotFoundException } from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Role, Status } from '@prisma/client';

@Injectable()
export class LessonsService {
    constructor(private prisma: PrismaService) { }

    async createLesson(payload: CreateLessonDto, currentUser: { id: number, role: Role }) {
        const existGroup = await this.prisma.group.findUnique({
            where: { id: payload.groupId, status: Status.ACTIVE },

        })

        if (!existGroup) {
            throw new NotFoundException("Group not found with this id")
        }

        await this.prisma.lesson.create({
            data: {
                ...payload,
                teacherId: currentUser.role == Role.TEACHER ? currentUser.id : null,
                userId: currentUser.role != Role.TEACHER ? currentUser.id : null
            }
        })
        return { 
            success: true,
            message: "lesson created successfully"
        }
    }

    async findOne(id: number) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id },
            include: {
                lessonVideo: true,
                group: true,
            }
        });

        if (!lesson) {
            throw new NotFoundException("Lesson not found");
        }

        return {
            success: true,
            data: lesson
        };
    }

    async update(id: number, dto: UpdateLessonDto) {
        const existLesson = await this.prisma.lesson.findUnique({ where: { id } });
        if (!existLesson) {
             throw new NotFoundException("Lesson not found");
        }

        const updatedLesson = await this.prisma.lesson.update({
            where: { id },
            data: { ...dto }
        });

        return {
            success: true,
            message: "Lesson updated successfully",
            data: updatedLesson
        };
    }

    async remove(id: number) {
        const existLesson = await this.prisma.lesson.findUnique({ where: { id } });
        if (!existLesson) {
             throw new NotFoundException("Lesson not found");
        }

        await this.prisma.lesson.delete({
            where: { id }
        });

        return {
            success: true,
            message: "Lesson deleted successfully"
        };
    }
}
