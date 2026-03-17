import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateRoomDto {
    @ApiProperty({ example: 'Room A' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 20 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    capacity: number;
}