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
    UseGuards,
} from '@nestjs/common';
import {
    ApiBody,
    ApiCookieAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FindAllRoomsDto } from './dto/find-all-rooms.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';

@ApiTags('Rooms')
@Controller('rooms')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) {}

    @Post()
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Yangi xona yaratish' })
    @ApiBody({ type: CreateRoomDto })
    create(@Body() dto: CreateRoomDto) {
        return this.roomsService.create(dto);
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Barcha xonalar ro\'yxati' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, example: 'A' })
    @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' })
    findAll(@Query() query: FindAllRoomsDto) {
        return this.roomsService.findAll(query);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGEMENT, Role.ADMINISTRATOR)
    @ApiOperation({ summary: 'Xonani ID bo\'yicha ko\'rish' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.roomsService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Xonani yangilash' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiBody({ type: UpdateRoomDto })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateRoomDto,
    ) {
        return this.roomsService.update(id, dto);
    }

    @Patch(':id/archive')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Xonani arxivga o\'tkazish' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    archive(@Param('id', ParseIntPipe) id: number) {
        return this.roomsService.archive(id);
    }

    @Patch(':id/restore')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Xonani arxivdan qayta faollashtirish' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    restore(@Param('id', ParseIntPipe) id: number) {
        return this.roomsService.restore(id);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    @ApiOperation({ summary: 'Xonani o\'chirish (DELETED)' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.roomsService.remove(id);
    }
}