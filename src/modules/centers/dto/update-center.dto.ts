import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';
import { CreateCenterDto } from './create-center.dto';

export class UpdateCenterDto extends PartialType(CreateCenterDto) {
  @ApiProperty({ required: false, example: 12 })
  @IsOptional()
  @IsNumber()
  xpToCoinRatio?: number;

  @ApiProperty({ required: false, example: 5 })
  @IsOptional()
  @IsNumber()
  attendanceXp?: number;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  maxHomeworkXp?: number;
}
