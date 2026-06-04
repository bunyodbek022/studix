import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class FreezeStudentGroupDto {
  @ApiProperty({
    example: '2026-06-01',
    description: 'Freeze boshlanish sanasi (ISO format)',
  })
  @IsDateString()
  @IsNotEmpty()
  freezeStartDate: string;

  @ApiProperty({
    example: '2026-07-01',
    description: 'Freeze tugash sanasi (ISO format)',
  })
  @IsDateString()
  @IsNotEmpty()
  freezeEndDate: string;
}
