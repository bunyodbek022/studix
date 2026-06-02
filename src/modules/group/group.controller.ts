import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { GroupsService } from './group.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/role.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import {
    ApiBearerAuth,
    ApiBody,
    ApiCookieAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { PaginationSearchDto } from './dto/pagination-search.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('groups')
@ApiCookieAuth('access_token')
export class GroupsController {
    constructor(private readonly groupService: GroupsService) { }

    @ApiOperation({
        summary: "Guruh darslari ro'yxatini ko'rish",
        description: "Guruhdagi barcha darslarni dars kunlari va soatlari bilan qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`, `TEACHER`"
    })
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN, Role.TEACHER)
    @Get('lesson/:groupId')
    getGroupLessons(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Req() req: any,
    ) {
        return this.groupService.getGroupLessons(groupId, req['user']);
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @Get()
    @ApiOperation({
        summary: "Barcha faol guruhlar ro'yxati",
        description: "Tizimdagi barcha faol guruhlar ro'yxatini qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    getAllGroup(@Req() req: any) {
        return this.groupService.getAllGroup(req['user']);
    }

    @Get(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruh ma'lumotlarini ko'rish",
        description: "Muayyan guruh tafsilotlarini uning unikal ID raqami bo'yicha qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.groupService.findOne(id);
    }

    @Get(':id/students')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruhdagi o'quvchilar ro'yxati",
        description: "Guruhdagi barcha o'quvchilarni sahifalab (pagination) va ism bo'yicha qidiruv filtri bilan qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        example: 'Dilnoza',
    })
    getStudents(
        @Param('id', ParseIntPipe) id: number,
        @Query() query: PaginationSearchDto,
    ) {
        return this.groupService.getStudents(id, query);
    }

    @Get(':id/lessons')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruh darslari tarixi",
        description: "Guruh uchun o'tilgan darslar ro'yxatini sahifalab va dars mavzusi bo'yicha qidirib qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        example: 'Array methods',
    })
    getLessons(
        @Param('id', ParseIntPipe) id: number,
        @Query() query: PaginationSearchDto,
    ) {
        return this.groupService.getLessons(id, query);
    }

    @Get(':id/schedule')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruh dars kunlari jadvali",
        description: "Guruhning dars jadvali, haftalik kunlari va dars soatlarini qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    getSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.groupService.getSchedule(id);
    }

    @Get(':id/attendance-days')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN, Role.TEACHER)
    @ApiOperation({
        summary: "Oy va yil boyicha guruhning dars kunlari ro'yxati (Davomat uchun)",
        description: "Guruh dars kunlarini ma'lum bir oy va yil bo'yicha olib beradi (kelgusi va o'tgan darslar bilan birga).\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`, `TEACHER`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiQuery({ name: 'month', required: true, type: Number, example: 5, description: "Oy (1-12)" })
    @ApiQuery({ name: 'year', required: false, type: Number, example: 2026, description: "Yil (kiritilmasa joriy yil olinadi)" })
    getAttendanceDays(
        @Param('id', ParseIntPipe) id: number,
        @Query('month', ParseIntPipe) month: number,
        @Query('year') year?: string,
    ) {
        return this.groupService.getAttendanceDays(id, month, year ? +year : undefined);
    }
    

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @Post()
    @ApiOperation({
        summary: "Yangi guruh yaratish",
        description: "Yangi o'quv guruhini yaratadi. Kurs ID, xona ID, o'qituvchi ID va haftalik kunlar kiritiladi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    createGroup(@Body() payload: CreateGroupDto, @Req() req: any) {
        return this.groupService.createGroup(payload, req['user']);
    }

    @Patch(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruhni yangilash",
        description: "Mavjud guruh sozlamalarini (nomi, o'qituvchisi, xonasi, dars soati) yangilaydi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiBody({ type: UpdateGroupDto })
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGroupDto) {
        return this.groupService.updateGroup(id, dto);
    }

    @Patch(':id/archive')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruhni arxivga o'tkazish",
        description: "Guruhni arxiv (INACTIVE) holatiga o'tkazadi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    archive(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.groupService.archive(id, req['user']);
    }

    @Patch(':id/restore')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruhni arxivdan qayta faollashtirish",
        description: "Arxivlangan guruhni faol (ACTIVE) holatga qaytaradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    restore(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.groupService.restore(id, req['user']);
    }

    @Delete(':id')
    @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
    @ApiOperation({
        summary: "Guruhni butunlay o'chirish (DELETED)",
        description: "Guruhni o'chirib yubormaydi, balki uning statusini DELETED holatiga o'tkazadi va guruhdagi barcha o'quvchilarni chiqarib yuboradi.\n\n" +
                     "**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`"
    })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.groupService.remove(id, req['user']);
    }
}
