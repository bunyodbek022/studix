import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import PrismaModule from './prisma/prisma.module';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { UsersModule } from './modules/users/users.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { StudentsModule } from './modules/students/students.module';
import { AuthModule } from './modules/auth/auth.module';
import { CourseModule } from './modules/course/course.module';
import { GroupModule } from './modules/group/group.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { UserSeeder } from './common/seeds/user.seeder';
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        JwtModule.registerAsync({
            global: true,
            imports: [ConfigModule],
            useFactory: async (
                configService: ConfigService,
            ): Promise<JwtModuleOptions> => ({
                secret: configService.get<string>('JWT_SECRET') as string,
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRATION_TIME', '1h'),
                },
            }),
            inject: [ConfigService],
        }),
        AuthModule,
        UsersModule,
        TeachersModule,
        StudentsModule,
        CourseModule,
        GroupModule,
        LessonsModule,
        RoomsModule,
    ],
    controllers: [],
    providers: [UserSeeder],
})
export class AppModule { }
