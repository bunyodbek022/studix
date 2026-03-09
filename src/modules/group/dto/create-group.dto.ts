import {
    IsInt,
    IsString,
    IsEnum,
    IsArray,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Status, WeekDays } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
    @ApiProperty()
    @IsInt()
    @Type(() => Number)
    teacherId: number;

    @ApiProperty()
    @IsInt()
    @Type(() => Number)
    roomId: number;

    @ApiProperty()
    @IsInt()
    @Type(() => Number)
    courseId: number;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsDateString()
    startDate: Date;

    @ApiProperty()
    @IsString()
    startTime: string;

    @ApiProperty()
    @IsArray()
    @IsEnum(WeekDays, { each: true })
    weekDays: WeekDays[];

}