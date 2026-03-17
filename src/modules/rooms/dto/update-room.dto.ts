import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRoomDto {
    @ApiPropertyOptional({ example: 'Room B' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 25 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    capacity?: number;

    @ApiPropertyOptional({ enum: Status })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;
}