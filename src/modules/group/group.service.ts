import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { Role, Status, WeekDays } from '@prisma/client';
import PrismaService from 'src/prisma/prisma.service';

@Injectable()
export class GroupsService {
    constructor(private prisma: PrismaService) { }

    async getGroupLessons(groupId: number, currentUser : {id : number, role:Role}) {

        const existGroup = await this.prisma.group.findUnique({
            where: {
                id:groupId,
                status:"ACTIVE"
            }
        })

        if (!existGroup) {
            throw new NotFoundException("Group not found")
        }

        if(currentUser.role == "TEACHER" && existGroup.teacherId != currentUser.id){
            throw new ForbiddenException("Bu sening guruhing emas")
        }

        const lessons = await this.prisma.lesson.findMany({
            where: {
                groupId
            }
        })

        return {
            success: true,
            data: lessons
        }
    }

    async getAllGroup() {
        const groups = await this.prisma.group.findMany({
            where: { status: "ACTIVE" }
        })

        return {
            success: true,
            data: groups
        }
    }

    async createGroup(payload: CreateGroupDto, currentUser: { id: number }) {
        const existTeacher = await this.prisma.teacher.findFirst({
            where: {
                id: payload.teacherId,
                status: Status.ACTIVE
            }
        })

        if (!existTeacher) {
            throw new NotFoundException("Teacher not found with this id")
        }

        const existCourse = await this.prisma.course.findFirst({
            where: {
                id: payload.courseId,
                status: Status.ACTIVE
            },
            select: {
                durationLesson: true
            }
        })

        if (!existCourse) {
            throw new NotFoundException("Course not found with this id")
        }

        const existRoom = await this.prisma.room.findFirst({
            where: {
                id: payload.roomId,
                status: Status.ACTIVE
            }
        })

        if (!existRoom) {
            throw new NotFoundException("Room not found with this id")
        }

        const existGroup = await this.prisma.group.findUnique({
            where: {
                name: payload.name,
                courseId: payload.courseId
            }
        })
        if (existGroup) {
            throw new ConflictException("Group already exist with this course")
        }


        function timeToMinutes(time: string): number {
            const [hour, minute] = time.split(':').map(Number);
            return hour * 60 + minute;
        }

        const roomGroups = await this.prisma.group.findMany({
            where: {
                roomId: payload.roomId,
                status: Status.ACTIVE
            },
            select: {
                startTime: true,
                weekDays: true,
                course: {
                    select: {
                        durationLesson: true
                    }
                }
            }
        })

        let newStartMinute = timeToMinutes(payload.startTime)
        let newEndMinute = timeToMinutes(payload.startTime) + existCourse.durationLesson
        const roomBusy = roomGroups.every(roomGroup => {
            const { startTime } = roomGroup
            let startMinute = timeToMinutes(startTime)
            let endMinute = timeToMinutes(startTime) + roomGroup.course.durationLesson

            return startMinute >= newEndMinute || endMinute <= newStartMinute

        })

        if (!roomBusy) {
            throw new BadRequestException("Bu vaqtga hona band")
        }

        await this.prisma.group.create({
            data: {
                ...payload,
                userId: currentUser.id,
                startDate: new Date(payload.startDate)
            }
        })

        return {
            success: true,
            message: "Group created"
        }
    }
}
