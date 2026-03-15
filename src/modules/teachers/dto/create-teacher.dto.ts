import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    MinLength,
} from 'class-validator';

export class CreateTeacherDto {
    @ApiProperty({ example: 'Jasur Karimov' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: 'jasur@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'secret123' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'Backend Developer' })
    @IsString()
    @IsNotEmpty()
    position: string;

    @ApiProperty({ example: 3 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    experience: number;

    @ApiPropertyOptional({ example: '+998901234567' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: '1990-01-01' })
    @IsOptional()
    @IsDateString()
    birth_date?: string;

}