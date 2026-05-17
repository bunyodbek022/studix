import { Module } from '@nestjs/common';
import { CentersService } from './centers.service';
import { CentersController } from './centers.controller';
import { MailModule } from 'src/common/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [CentersController],
  providers: [CentersService],
})
export class CentersModule {}
