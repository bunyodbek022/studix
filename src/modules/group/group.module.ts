import { Module } from '@nestjs/common';
import { GroupsService } from './group.service';
import { GroupsController } from './group.controller';
import { StudentGroupController } from './student-group/student-group.controller';
import { StudentGroupService } from './student-group/student-group.service';


@Module({
  controllers: [GroupsController, StudentGroupController],
  providers: [GroupsService, StudentGroupService],
})
export class GroupModule {}
