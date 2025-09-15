// src/offers/dto/create-offer.dto.ts
import { IsNotEmpty, IsEnum, IsString } from 'class-validator';
import { OfferReason, OfferPropertyType } from '@prisma/client';

export class CreateOfferDto {
  @IsNotEmpty()
  @IsString()
  clientName!: string;

  @IsNotEmpty()
  @IsEnum(OfferReason)
  reason!: OfferReason;

  @IsNotEmpty()
  @IsEnum(OfferPropertyType)
  propertyType!: OfferPropertyType;
  
  @IsNotEmpty()
  @IsString()
  phoneNumber!: string;
}