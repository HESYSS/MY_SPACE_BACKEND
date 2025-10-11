// src/crm/crm.module.ts
import { Module } from "@nestjs/common";
import { CrmService } from "./crm.service";
import { CrmController } from "./crm.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslateService } from "../translate/translate.service";

@Module({
  imports: [PrismaModule], // 👈 теперь PrismaService доступен
  providers: [CrmService, TranslateService],
  controllers: [CrmController],
})
export class CrmModule {}
