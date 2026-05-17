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
    constructor(private readonly studentGroupService: StudentGroupService) { }

    @Post()
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruhga talaba qo'shish",
        description: "Talabani muayyan o'quv guruhiga qo'shadi. Xona sig'imi tekshiriladi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiBody({ type: CreateStudentGroupDto })
    create(@Body() dto: CreateStudentGroupDto, @Req() req) {
        return this.studentGroupService.create(dto, req['user']);
    }

    @Get()
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Barcha talaba-guruh bog'lanishlarini ko'rish",
        description: "Tizimdagi barcha talabalar va ularning guruhlarga a'zolik bog'lanishlari ro'yxatini qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'Dilnoza' })
    @ApiQuery({ name: 'groupId', required: false, type: Number, example: 1 })
    findAll(@Query() query: FindAllStudentGroupDto) {
        return this.studentGroupService.findAll(query);
    }

    @Get(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Talaba-guruh yozuvini ID bo'yicha ko'rish",
        description: "Muayyan talabaning guruhga a'zolik yozuvini uning ID raqami bo'yicha qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.studentGroupService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Talaba-guruh a'zolik statusini yangilash",
        description: "Talabaning guruhdagi holatini (faol, guruhni tark etgan va hk) yangilaydi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiBody({ type: UpdateStudentGroupDto })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateStudentGroupDto,
    ) {
        return this.studentGroupService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Talabani guruhdan chiqarish (INACTIVE)",
        description: "Talabaning guruhdagi a'zoligini butunlay o'chirmaydi, balki statusini INACTIVE holatiga o'tkazib, guruhdan chiqaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.studentGroupService.remove(id);
    }
}