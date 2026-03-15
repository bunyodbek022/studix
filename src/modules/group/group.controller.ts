import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GroupsService } from './group.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/role.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PaginationSearchDto } from './dto/pagination-search.dto';

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
        @Param("groupId", ParseIntPipe) groupId: number,
        @Req() req: Request
    ) {
        return this.groupService.getGroupLessons(groupId, req["user"])
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @Get("all")
    getAllGroup() {
        return this.groupService.getAllGroup()
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Guruh detallari' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.groupService.findOne(id);
    }

    @Get(':id/students')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Guruh studentlari ro\'yxati' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'Dilnoza' })
    getStudents(
        @Param('id', ParseIntPipe) id: number,
        @Query() query: PaginationSearchDto,
    ) {
        return this.groupService.getStudents(id, query);
    }

    @Get(':id/lessons')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Guruh darslari ro\'yxati' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'Array methods' })
    getLessons(
        @Param('id', ParseIntPipe) id: number,
        @Query() query: PaginationSearchDto,
    ) {
        return this.groupService.getLessons(id, query);
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
