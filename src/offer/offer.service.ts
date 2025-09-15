// src/offers/offer.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Offer, OfferStatus } from '@prisma/client';

@Injectable()
export class OfferService {
  constructor(private prisma: PrismaService) {}

  /**
   * Создает новый оффер в базе данных.
   * @param data - Данные для создания оффера.
   * @returns Созданный оффер.
   */
  async createOffer(data: {
    clientName: string;
    reason: 'BUYING' | 'SELLING';
    propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND';
    phoneNumber: string;
  }): Promise<Offer> {
    return this.prisma.offer.create({ data });
  }

  /**
   * Возвращает все офферы, отсортированные по времени создания.
   * @returns Массив офферов.
   */
  async getAllOffers(): Promise<Offer[]> {
    return this.prisma.offer.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Обновляет статус оффера по его ID.
   * @param id - Уникальный идентификатор оффера.
   * @param status - Новый статус оффера.
   * @returns Обновленный оффер.
   */
  async updateOfferStatus(id: number, status: OfferStatus): Promise<Offer> {
    return this.prisma.offer.update({
      where: { id },
      data: { status },
    });
  }
}