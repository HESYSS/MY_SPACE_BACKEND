// src/items/items.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: any) {
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 10;
    const skip = (page - 1) * limit;

    const items = await this.prisma.item.findMany({
      where: {
        status: filters.status,
        type: filters.type,
        deal: filters.deal,
        location: filters.city
          ? { city: { contains: filters.city, mode: "insensitive" } }
          : undefined,
      },
      include: {
        location: true,
        prices: true,
        contacts: true,
        images: true,
      },
      skip,
      take: limit,
    });

    // Возвращаем каждый объект с первой картинкой
    return items.map((item) => ({
      ...item,
      firstImage: item.images?.length ? item.images[0].url : null,
    }));
  }

  async findOne(id: string) {
    return this.prisma.item.findUnique({
      where: { crmId: id },
      include: {
        location: true,
        prices: true,
        contacts: true,
        images: true,
      },
    });
  }
}
