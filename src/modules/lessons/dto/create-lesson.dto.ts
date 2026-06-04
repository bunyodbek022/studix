import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty()
  @IsNumber()
  groupId: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: '2026-05-17',
    description: 'Dars otilgan sana (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  lessonDate?: string;
}
