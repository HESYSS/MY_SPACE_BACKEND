// src/offers/offer.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  BadRequestException,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OfferService } from './offer.service';

// DTO (Data Transfer Objects) для валидации входящих данных
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { Request } from 'express';

// Интерфейс для типизации объекта запроса с данными пользователя
interface CustomRequest extends Request {
  user: {
    id: number;
    username: string;
    role: string;
  };
}

@Controller('offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  async create(@Body() createOfferDto: CreateOfferDto) {
    return this.offerService.createOffer(createOfferDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Req() req: CustomRequest) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для просмотра офферов.');
    }
    return this.offerService.getAllOffers();
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOfferStatusDto,
    @Req() req: CustomRequest,
  ) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для изменения статуса оффера.');
    }

    const offerId = parseInt(id, 10);
    if (isNaN(offerId)) {
      throw new BadRequestException('Invalid ID');
    }
    return this.offerService.updateOfferStatus(offerId, updateStatusDto.status);
  }
}