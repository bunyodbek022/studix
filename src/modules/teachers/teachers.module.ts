import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import PrismaModule from 'src/prisma/prisma.module';
import { MailModule } from 'src/common/mail/mail.module';

@Module({
    imports: [PrismaModule, MailModule],
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeachersModule {}
