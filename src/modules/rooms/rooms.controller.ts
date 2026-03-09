import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/role.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { ApiCookieAuth } from '@nestjs/swagger';

@Controller('rooms')
@ApiCookieAuth("access_token")
export class RoomsController {
    constructor(private readonly roomService : RoomsService){}

     @UseGuards(AuthGuard, RolesGuard)
        @Roles(Role.ADMIN, Role.SUPERADMIN)
        @Get("all")
        getAllRoom() {
            return this.roomService.getAllRoom()
        }
    
        @UseGuards(AuthGuard, RolesGuard)
        @Roles(Role.ADMIN, Role.SUPERADMIN)
        @Post()
        createRoom(@Body() payload: CreateRoomDto) {
            return this.roomService.createRoom(payload)
        }
}
