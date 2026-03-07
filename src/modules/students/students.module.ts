import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import PrismaModule from 'src/prisma/prisma.module';
import { MailModule } from 'src/common/mail/mail.module';

@Module({
    imports: [PrismaModule, MailModule],
    controllers: [StudentsController],
    providers: [StudentsService],
})
export class StudentsModule { }
