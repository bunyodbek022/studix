import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
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
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Yangi xona yaratish',
    description:
      "Yangi dars xonasini yaratadi. Nomi unikal va xona sig'imi musbat son bo'lishi lozim.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiBody({ type: CreateRoomDto })
  create(@Body() dto: CreateRoomDto, @Req() req: RequestWithUser) {
    return this.roomsService.create(dto, req.user);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Barcha xonalar ro'yxati",
    description:
      "Tizimdagi barcha xonalarni sahifalab (pagination), status bo'yicha yoki nomi bo'yicha qidirib qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'A' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE'],
    example: 'ACTIVE',
  })
  findAll(@Query() query: FindAllRoomsDto, @Req() req: RequestWithUser) {
    return this.roomsService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Xonani ID bo'yicha ko'rish",
    description:
      "Muayyan xona ma'lumotlarini uning unikal ID raqami bo'yicha qaytaradi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Xonani yangilash',
    description:
      "Mavjud xona ma'lumotlarini yangilaydi. Nom o'zgarsa, uning unikal ekanligi qaytadan tekshiriladi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: UpdateRoomDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @Patch(':id/archive')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Xonani arxivga o'tkazish",
    description:
      "Xonani arxiv (INACTIVE) holatiga o'tkazadi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.archive(id);
  }

  @Patch(':id/restore')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Xonani arxivdan qayta faollashtirish',
    description:
      'Arxivlangan (INACTIVE) xonani faol (ACTIVE) holatga qaytaradi.\n\n' +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.restore(id);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Xonani o'chirish (DELETED)",
    description:
      "Xonani butunlay o'chirmaydi, balki uning statusini DELETED holatiga o'tkazadi.\n\n" +
      '**Ruxsat (Access):** Rollar: `SUPERADMIN`, `CREATOR`, `ADMIN`',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}
