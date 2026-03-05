import { IsString, IsEmail, IsEnum, IsOptional, IsDateString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'Dilnoza Yusupova' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'dilnoza@example.com' })
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

  @ApiProperty({ example: '2000-05-20' })
  @IsDateString()
  birth_date: string;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}