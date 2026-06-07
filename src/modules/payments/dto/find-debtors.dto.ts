import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Status } from '@prisma/client';

export class FindDebtorsDto {
  @ApiPropertyOptional({ example: 1, description: 'Sahifa raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Har sahifadagi yozuvlar soni' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: "Student ismi yoki telefon raqami bo'yicha qidiruv" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "StudentGroup holati (default: ACTIVE). Barcha statuslar uchun 'ALL' yuboring",
    enum: ['ACTIVE', 'FREEZE', 'INACTIVE', 'PROBATION', 'DELETED', 'ALL'],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsString()
  status?: string = 'ACTIVE';

  @ApiPropertyOptional({ description: 'Guruh holati bo\'yicha filter', enum: Status })
  @IsOptional()
  @IsEnum(Status)
  groupStatus?: Status;

  @ApiPropertyOptional({ description: "Guruh ID si bo'yicha filter", example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional({ description: 'Minimum qarz miqdori (musbat son, so\'mda)', example: 50000 })
  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maksimum qarz miqdori (musbat son, so\'mda)', example: 500000 })
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Boshlang\'ich sana (ISO format)', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Tugash sanasi (ISO format)', example: '2026-12-31' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Saralash maydoni',
    enum: ['amount', 'createdAt', 'updatedAt', 'studentName'],
    default: 'updatedAt',
  })
  @IsOptional()
  @IsIn(['amount', 'createdAt', 'updatedAt', 'studentName'])
  sortBy?: string = 'updatedAt';

  @ApiPropertyOptional({
    description: 'Saralash tartibi',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
