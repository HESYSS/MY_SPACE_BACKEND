// src/prisma/prisma.module.ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global() // 👈 делает модуль глобальным (не придётся импортить в каждом)
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
