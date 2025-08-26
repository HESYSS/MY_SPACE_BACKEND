import { Module } from "@nestjs/common";
import { CrmModule } from "../crm/crm.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ItemsModule } from "../items/items.module";
import { EmployeeModule } from "../employee/employee.module";

@Module({
  imports: [PrismaModule, CrmModule, ItemsModule, EmployeeModule],
})
export class AppModule {}
