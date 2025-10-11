// src/crm/crm.module.ts
import { Module } from "@nestjs/common";
import { CrmService } from "./crm.service";
import { CrmController } from "./crm.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslateService } from "../translate/translate.service";
import { TranslateModule } from "../translate/translate.module";

@Module({
  imports: [PrismaModule, TranslateModule], // 👈 теперь PrismaService доступен
  providers: [CrmService],
  controllers: [CrmController],
})
export class CrmModule {}
