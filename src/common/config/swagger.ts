import { DocumentBuilder } from "@nestjs/swagger";

export const config = new DocumentBuilder()
  .setTitle('Studix example')
  .setDescription('The studix API description')
  .setVersion('1.0')
  .build();
