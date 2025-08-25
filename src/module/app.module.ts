// src/app.module.ts
import { Module } from "@nestjs/common";
import { CrmModule } from "../crm/crm.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, CrmModule],
})
export class AppModule {}
