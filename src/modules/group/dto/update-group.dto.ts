import { ApiPropertyOptional } from '@nestjs/swagger';
import { WeekDays, Status } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
} from 'class-validator';

export class UpdateGroupDto {
    @ApiPropertyOptional({ example: 'N-26' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    courseId?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    teacherId?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    roomId?: number;

    @ApiPropertyOptional({ example: '2026-03-01' })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ example: '09:00' })
    @IsOptional()
    @IsString()
    startTime?: string;

    @ApiPropertyOptional({ enum: WeekDays, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(WeekDays, { each: true })
    weekDays?: WeekDays[];

    @ApiPropertyOptional({ enum: Status })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;
}