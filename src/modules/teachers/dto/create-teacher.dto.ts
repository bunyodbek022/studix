import { IsString, IsEmail, IsEnum, IsOptional, IsInt, MinLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class CreateTeacherDto {
  @ApiProperty({ example: 'Jasur Karimov' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'jasur@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Backend Developer' })
  @IsString()
  position: string;

  @ApiProperty({ example: 5, minimum: 0 })
  @IsInt()
  @Min(0)
  experience: number;

}