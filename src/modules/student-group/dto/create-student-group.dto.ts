import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateStudentGroupDto {
    @ApiProperty({ example: 1 })
    @IsInt()
    @IsNotEmpty()
    groupId: number;

    @ApiProperty({ example: 12 })
    @IsInt()
    @IsNotEmpty()
    studentId: number;
}