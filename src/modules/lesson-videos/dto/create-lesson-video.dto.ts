import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";
import { Type } from "class-transformer";

export class CreateLessonVideoDto {
    @ApiProperty()
    @IsNumber()
    @Type(() => Number)
    lessonId: number;

    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty({ type: 'string', format: 'binary' })
    file: any;
}
