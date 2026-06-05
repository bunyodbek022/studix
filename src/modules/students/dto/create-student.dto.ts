import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  MinLength,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStudentDto {
  @ApiProperty({ example: 'Dilnoza Yusupova' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'dilnoza@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  photo?: any;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '2000-05-20' })
  @IsDateString()
  birth_date: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;
}
