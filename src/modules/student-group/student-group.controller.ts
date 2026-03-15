import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { StudentGroupService } from "./student-group.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/role.guard";
import { Roles } from "src/common/decorators/role.decorator";
import { Role } from "@prisma/client";
import { CreateStudentGroupDto } from "./dto/create-student-group.dto";
import { UpdateStudentGroupDto } from "./dto/update-student-group.dto";
import { FindAllStudentGroupDto } from "./dto/find-all-student-group.dto";

@ApiTags('Student Groups')
@Controller('student-groups')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class StudentGroupController {
    constructor(private readonly studentGroupService: StudentGroupService) {}

    @Post()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Guruhga student qo\'shish' })
    @ApiBody({ type: CreateStudentGroupDto })
    create(@Body() dto: CreateStudentGroupDto, @Req() req) {
        return this.studentGroupService.create(dto, req['user']);
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Barcha student-guruh yozuvlari' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'Dilnoza' })
    @ApiQuery({ name: 'groupId', required: false, type: Number, example: 1 })
    findAll(@Query() query: FindAllStudentGroupDto) {
        return this.studentGroupService.findAll(query);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Student-guruh yozuvini ID bo\'yicha ko\'rish' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.studentGroupService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Student-guruh statusini yangilash' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiBody({ type: UpdateStudentGroupDto
        
     })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateStudentGroupDto,
    ) {
        return this.studentGroupService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Student-guruhdan chiqarish (INACTIVE)' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.studentGroupService.remove(id);
    }
}