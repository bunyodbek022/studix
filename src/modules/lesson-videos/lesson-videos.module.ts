import { Module } from '@nestjs/common';
import { LessonVideosService } from './lesson-videos.service';
import { LessonVideosController } from './lesson-videos.controller';

@Module({
  controllers: [LessonVideosController],
  providers: [LessonVideosService],
})
export class LessonVideosModule {}
