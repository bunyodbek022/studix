import { ConflictException, Injectable } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import PrismaService from 'src/prisma/prisma.service';

@Injectable()
export class RoomsService {
    constructor(private prisma : PrismaService){}
    
        async getAllRoom(){
            const rooms = await this.prisma.room.findMany({
                where:{status:"ACTIVE"}
            })
    
            return {
                success : true,
                data : rooms
            }
        }
    
        async createRoom(payload : CreateRoomDto){
            const existRoom = await this.prisma.room.findUnique({
                where:{name:payload.name}
            })
            if(existRoom){
                throw new ConflictException("Room name alread exist")
            }
    
            await this.prisma.room.create({
                data:payload
            })
    
            return {
                success : true,
                message : "Room created"
            }
        }
}
