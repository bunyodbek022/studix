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
import { StudentGroupModule } from './modules/student-group/student-group.module';
import { LessonVideosModule } from './modules/lesson-videos/lesson-videos.module';
import { LabelsModule } from './modules/labels/labels.module';
import { CentersModule } from './modules/centers/centers.module';
import { BranchesModule } from './modules/branches/branches.module';
import { RolePermissionsModule } from './modules/role-permissions/role-permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('JWT_SECRET is not set');
        }

        const expiresIn = (configService.get<string>('JWT_EXPIRATION_TIME') ??
          '1h') as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    TeachersModule,
    StudentsModule,
    CourseModule,
    GroupModule,
    LessonsModule,
    LessonVideosModule,
    RoomsModule,
    StudentGroupModule,
    LabelsModule,
    CentersModule,
    BranchesModule,
    RolePermissionsModule,
  ],
  controllers: [],
  providers: [UserSeeder],
})
export class AppModule {}
