import { Module } from "@nestjs/common";
import { CrmModule } from "../crm/crm.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ItemsModule } from "../items/items.module";

@Module({
  imports: [PrismaModule, CrmModule, ItemsModule],
})
export class AppModule {}
