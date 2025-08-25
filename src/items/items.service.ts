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

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.deal) where.deal = filters.deal;

    if (filters.city) {
      where.location = {
        is: {
          city: { contains: filters.city, mode: "insensitive" },
        },
      };
    }

    const items = await this.prisma.item.findMany({
      where,
      include: {
        location: true,
        prices: true,
        contacts: true,
        images: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          take: 1,
        },
      },
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    return items.map((item) => ({
      ...item,
      firstImage: item.images?.[0]?.url || null,
      images: undefined,
    }));

    // возвращаем объект с полем firstImage
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
