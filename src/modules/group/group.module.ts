import { Module } from '@nestjs/common';
import { GroupsService } from './group.service';
import { GroupsController } from './group.controller';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupModule {}
