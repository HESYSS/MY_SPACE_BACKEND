// src/main.ts

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./module/app.module";
import cors from "cors";
import { ValidationPipe } from "@nestjs/common"; // <-- Импортируем ValidationPipe

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        "https://6ee60f8d63ae5b82bdf0352d5861f8ab.serveo.net",
      ],
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    })
  );

  // <-- Вставляем эту строку
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Включаем автоматическое преобразование типов
    })
  );

  await app.listen(3001);
  console.log(`Server running on http://localhost:3001`);
}

bootstrap();
