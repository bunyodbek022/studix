import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    branchId?: number;
}