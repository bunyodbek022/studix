import { DocumentBuilder } from "@nestjs/swagger";

export const config = new DocumentBuilder()
  .setTitle('Studix Platforms')
  .setDescription('Student Mangement System')
  .setVersion('1.0')
  .build();
