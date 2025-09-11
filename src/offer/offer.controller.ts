// src/offers/offer.controller.ts
import { Controller, Post, Get, Patch, Body, Param, BadRequestException } from '@nestjs/common';
import { OfferService } from './offer.service';

// DTO (Data Transfer Objects) для валидации входящих данных
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';

@Controller('offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  async create(@Body() createOfferDto: CreateOfferDto) {
    return this.offerService.createOffer(createOfferDto);
  }

  @Get()
  async findAll() {
    return this.offerService.getAllOffers();
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOfferStatusDto,
  ) {
    // Преобразуем id из строки в число
    const offerId = parseInt(id, 10);
    // Проверяем, что id является валидным числом
    if (isNaN(offerId)) {
      throw new BadRequestException('Invalid ID');
    }
    return this.offerService.updateOfferStatus(offerId, updateStatusDto.status);
  }
}