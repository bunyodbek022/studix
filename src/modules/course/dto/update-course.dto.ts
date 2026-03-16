import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel, Status } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class UpdateCourseDto {
    @ApiPropertyOptional({ example: 'Nodejs Backend Pro' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 6 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    durationMonth?: number;

    @ApiPropertyOptional({ example: 90 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    durationLesson?: number;

    @ApiPropertyOptional({ example: '1800000' })
    @IsOptional()
    price?: string;

    @ApiPropertyOptional({ enum: CourseLevel, example: CourseLevel.INTERMEDIATE })
    @IsOptional()
    @IsEnum(CourseLevel)
    level?: CourseLevel;

    @ApiPropertyOptional({ example: 'Yangilangan kurs tavsifi' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ enum: Status, example: Status.ACTIVE })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;
}