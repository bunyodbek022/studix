import { Injectable, NotFoundException } from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
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
    }
}
