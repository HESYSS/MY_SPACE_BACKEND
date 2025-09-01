import { NestFactory } from "@nestjs/core";
import { AppModule } from "./module/app.module";

import cors from "cors";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    cors({
      origin: "http://localhost:3000", // адрес фронта
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    })
  );

  await app.listen(3001);
  console.log(`Server running on http://localhost:3001`);
}
bootstrap();
