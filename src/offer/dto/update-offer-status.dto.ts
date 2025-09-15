// src/offers/dto/update-offer-status.dto.ts
import { IsNotEmpty, IsEnum } from 'class-validator';
import { OfferStatus } from '@prisma/client';

export class UpdateOfferStatusDto {
  @IsNotEmpty()
  @IsEnum(OfferStatus)
  status!: OfferStatus;
}