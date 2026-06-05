import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Frontend Developer' })
  @IsString()
  position: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  hire_date: string;

  @ApiPropertyOptional({ example: 'Tashkent, Uzbekistan' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;
}
