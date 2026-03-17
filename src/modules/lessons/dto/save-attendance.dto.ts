import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, ValidateNested } from 'class-validator';

export class AttendanceItemDto {
    @ApiProperty({ example: 1 })
    @IsInt()
    studentId: number;

    @ApiProperty({ example: true })
    @IsBoolean()
    isPresent: boolean;
}

export class SaveAttendanceDto {
    @ApiProperty({ type: [AttendanceItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttendanceItemDto)
    items: AttendanceItemDto[];
}