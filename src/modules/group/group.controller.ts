import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { GroupsService } from './group.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/role.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation } from '@nestjs/swagger';

@Controller('groups')
@ApiCookieAuth('access_token')
export class GroupsController {
    constructor(private readonly groupService: GroupsService) { }

    @ApiOperation({
        summary: `${Role.SUPERADMIN}, ${Role.ADMIN}, ${Role.TEACHER}`
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles("ADMIN", "SUPERADMIN", "TEACHER")
    @Get("lesson/:groupId")
    getGroupLessons(
        @Param("groupId",ParseIntPipe) groupId : number,
        @Req() req:Request
    ) {
        return this.groupService.getGroupLessons(groupId,req["user"])
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @Get("all")
    getAllGroup() {
        return this.groupService.getAllGroup()
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @Post()
    createGroup(
        @Body() payload: CreateGroupDto,
        @Req() req: Request
    ) {
        return this.groupService.createGroup(payload, req["user"])
    }
}
