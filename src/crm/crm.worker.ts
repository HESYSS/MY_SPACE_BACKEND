import { NestFactory } from "@nestjs/core";
import { AppModule } from "../module/app.module";
import { CrmService } from "./crm.service";

async function bootstrap() {
  // Создаём отдельный NestJS контекст для worker
  const appContext = await NestFactory.createApplicationContext(AppModule);

  // Получаем CrmService через DI
  const crmService = appContext.get(CrmService);

  console.log("👷 CRM Worker запущен");

  // Запускаем синхронизацию и перевод
  crmService.startScheduler();
}

bootstrap().catch((err) => {
  console.error("❌ Ошибка запуска CRM Worker:", err);
  process.exit(1);
});
