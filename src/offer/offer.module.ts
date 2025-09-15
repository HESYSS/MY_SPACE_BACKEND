// src/offers/offer.module.ts
import { Module } from '@nestjs/common';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';
import { PrismaService } from '../prisma/prisma.service'; // Убедитесь, что у вас есть этот файл

@Module({
  controllers: [OfferController],
  providers: [OfferService, PrismaService],
})
export class OfferModule {}