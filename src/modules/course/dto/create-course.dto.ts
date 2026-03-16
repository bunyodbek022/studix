import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsDecimal,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateCourseDto {
    @ApiProperty({ example: 'Nodejs Backend' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 6 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    durationMonth: number;

    @ApiProperty({ example: 90 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    durationLesson: number;

    @ApiProperty({ example: '1500000' })
    @IsNotEmpty()
    price: string;

    @ApiPropertyOptional({ enum: CourseLevel, example: CourseLevel.BEGINNER })
    @IsOptional()
    @IsEnum(CourseLevel)
    level?: CourseLevel;

    @ApiPropertyOptional({ example: 'Node.js orqali backend dasturlash' })
    @IsOptional()
    @IsString()
    description?: string;
}