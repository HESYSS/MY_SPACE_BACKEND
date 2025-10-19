import { NestFactory } from "@nestjs/core";
import { AppModule } from "./module/app.module";
import cors from "cors";
import { ValidationPipe } from "@nestjs/common";
import { fork } from "child_process";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    cors({
      origin: [
        "https://myspace.in.ua",
        "https://www.myspace.in.ua",
      ],
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    })
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    })
  );

  await app.listen(3001);
  console.log(`Server running on http://localhost:3001`);

  // ===== Запуск CRM Worker =====
  const workerPath = join(__dirname, "crm", "crm.worker.js"); // путь к скомпилированному JS
  const crmWorker = fork(workerPath);

  crmWorker.on("message", (msg) => console.log("CRM Worker:", msg));
  crmWorker.on("exit", (code) =>
    console.log(`CRM Worker завершился с кодом ${code}`)
  );

  console.log("CRM Worker запущен в отдельном процессе");
}

bootstrap();
