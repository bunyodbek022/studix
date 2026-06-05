import { ApiProperty } from '@nestjs/swagger';
import { ReasonCategory, Role } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReasonDto {
  @ApiProperty({ example: 'Darsda faol ishtirok etganligi uchun' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ReasonCategory, example: ReasonCategory.ADD_XP })
  @IsEnum(ReasonCategory)
  @IsNotEmpty()
  category: ReasonCategory;

  @ApiProperty({ enum: Role, isArray: true, example: [Role.TEACHER, Role.ADMIN] })
  @IsArray()
  @IsEnum(Role, { each: true })
  roles: Role[];

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  branchId?: number;
}
