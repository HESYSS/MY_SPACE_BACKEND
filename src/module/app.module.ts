import { Module } from "@nestjs/common";
import { CrmModule } from "../crm/crm.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ItemsModule } from "../items/items.module";

import { TilesController } from "../mapbox/tiles.controller";

import { EmployeeModule } from "../employee/employee.module";
import { OfferModule } from "../offer/offer.module";

@Module({
  imports: [PrismaModule, CrmModule, ItemsModule, EmployeeModule, OfferModule],

  controllers: [TilesController],
})
export class AppModule {}
