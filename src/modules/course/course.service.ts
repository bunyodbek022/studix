import { ConflictException, Injectable } from '@nestjs/common';
import PrismaService from 'src/prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CourseService {
    constructor(private prisma : PrismaService){}

    async getAllCourse(){
        const courses = await this.prisma.course.findMany({
            where:{status:"ACTIVE"}
        })

        return {
            success : true,
            data : courses
        }
    }

    async createCourse(payload : CreateCourseDto){
        const existCourse = await this.prisma.course.findUnique({
            where:{name:payload.name}
        })
        if(existCourse){
            throw new ConflictException("Course name alread exist")
        }

        await this.prisma.course.create({
            data:payload
        })

        return {
            success : true,
            message : "Course created"
        }
    }
}
