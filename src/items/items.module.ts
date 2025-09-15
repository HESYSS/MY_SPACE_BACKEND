import { Module } from "@nestjs/common";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";
import { PrismaService } from "../prisma/prisma.service";
import { CrmService } from "../crm/crm.service";
import { TranslateService } from "../translate/translate.service";

@Module({
  providers: [ItemsService, PrismaService, CrmService, TranslateService],
  controllers: [ItemsController],
})
export class ItemsModule {}
