import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { PaginationSearchDto } from './pagination-search.dto';

export class GroupLessonsQueryDto extends PaginationSearchDto {
    @ApiPropertyOptional({ example: 5, description: 'Oy (1-12)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;

    @ApiPropertyOptional({ example: 2026, description: 'Yil (masalan: 2026)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(2000)
    year?: number;
}
