import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, Min, Max } from 'class-validator';

export class MakePaymentDto {
  @ApiProperty({ example: 300000, description: "To'lov summasi (so'mda)" })
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 6, description: 'Qaysi oy uchun (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsNotEmpty()
  month: number;

  @ApiProperty({ example: 2026, description: 'Qaysi yil uchun' })
  @IsInt()
  @Min(2020)
  @IsNotEmpty()
  year: number;
}
