import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateStudentGroupDto {
    @ApiProperty({ enum: Status, example: Status.INACTIVE })
    @IsEnum(Status)
    @IsNotEmpty()
    status: Status;
}