import { Module } from "@nestjs/common";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";
import { PrismaService } from "../prisma/prisma.service";
import { CrmService } from "../crm/crm.service";

@Module({
  controllers: [ItemsController],
  providers: [ItemsService, PrismaService, CrmService],
})
export class ItemsModule {}
