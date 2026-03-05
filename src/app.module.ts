import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import PrismaModule from './prisma/prisma.module';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { UsersModule } from './modules/users/users.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { StudentsModule } from './modules/students/students.module';
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
        UsersModule,
        TeachersModule,
        StudentsModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
