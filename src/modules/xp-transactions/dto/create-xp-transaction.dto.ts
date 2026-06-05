import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateXpTransactionDto {
  @ApiProperty({ example: 10, description: 'Positive or negative XP amount' })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  amountXp: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the reason' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  reasonId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the student receiving/losing XP' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  studentId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the teacher receiving/losing XP' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  teacherId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the user (admin) receiving/losing XP' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({ example: 'Excellent performance in class' })
  @IsString()
  @IsOptional()
  description?: string;
}
