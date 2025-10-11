// src/translate/translate.module.ts
import { Module } from "@nestjs/common";
import { TranslateService } from "./translate.service";

@Module({
  providers: [TranslateService],
  exports: [TranslateService], // <-- экспортируем, чтобы другие модули могли использовать
})
export class TranslateModule {}
