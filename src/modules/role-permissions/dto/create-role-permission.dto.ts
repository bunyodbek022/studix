import { IsString, IsEnum, IsArray, IsOptional, IsInt } from 'class-validator';
import { Label, RoleActions, Status } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRolePermissionDto {
  @ApiProperty({ example: 'Marketing Manager' })
  @IsString()
  name: string;

  @ApiProperty({ example: '#FF5733' })
  @IsString()
  color: string;

  @ApiProperty({ enum: Label })
  @IsEnum(Label)
  label: Label;

  @ApiProperty({ enum: RoleActions, isArray: true })
  @IsArray()
  @IsEnum(RoleActions, { each: true })
  actions: RoleActions[];

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  branchId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  centerId?: number;
}
