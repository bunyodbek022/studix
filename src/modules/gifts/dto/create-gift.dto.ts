import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGiftDto {
  @ApiProperty({ example: 'Studix T-shirt' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Original Studix logo T-shirt' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priceInCoins: number;

  @ApiPropertyOptional({ example: 50 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ enum: Status, example: Status.ACTIVE })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  branchId?: number;
}
