import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateCenterDto {
  @ApiProperty({ example: 'My Academy' })
  @IsNotEmpty()
  @IsString()
  centerName: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  creatorFullName: string;

  @ApiProperty({ example: 'john@academy.com' })
  @IsNotEmpty()
  @IsEmail()
  creatorEmail: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  creatorPassword: string;

  @ApiProperty({ example: 'Director' })
  @IsNotEmpty()
  @IsString()
  creatorPosition: string;

  @ApiProperty({ example: '+998901234567', required: false })
  @IsOptional()
  @IsString()
  creatorPhone?: string;
}
