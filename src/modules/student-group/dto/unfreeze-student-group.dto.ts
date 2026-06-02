import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UnfreezeStudentGroupDto {
    @ApiProperty({
        example: '2026-06-20',
        description:
            "Erta chiqarish sanasi (ISO format). Bo'lmasa bugungi sana ishlatiladi.",
        required: false,
    })
    @IsDateString()
    @IsOptional()
    unfrozenAt?: string;
}
