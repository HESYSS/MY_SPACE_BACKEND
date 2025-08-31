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
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        location: {
          select: {
            street: true,
          },
        },
        prices: {
          select: {
            value: true,
            currency: true,
          },
        },
        images: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          take: 1,
          select: { url: true },
        },
        // 👇 если комнаты и площадь хранятся в характеристиках
        characteristics: {
          select: {
            key: true,
            value: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    return items.map((item) => {
      const rooms =
        item.characteristics.find((c) => c.key === "rooms")?.value ?? 0;
      const area =
        item.characteristics.find((c) => c.key === "area")?.value ?? 0;

      return {
        id: String(item.id),
        title: item.title ?? "",
        discription: item.description ?? "",
        prices: item.prices,
        rooms,
        area,
        firstImage: item.images?.[0]?.url || null,
        street: item.location?.street ?? "",
        type: item.type ?? "",
      };
    });
  }

  async getCoordinates(filters: any) {
    // фильтры могут быть: deal, type, city, status и т.д.
    const where: any = {};

    if (filters.deal) {
      where.deal = filters.deal;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.city) {
      where.location = { city: filters.city };
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const items = await this.prisma.item.findMany({
      where,
      select: {
        id: true,
        location: {
          select: {
            lat: true,
            lng: true,
          },
        },
      },
    });

    // возвращаем только id и координаты
    return items
      .filter((i) => i.location?.lat && i.location?.lng)
      .map((i) => ({
        id: i.id,
        lat: i.location!.lat,
        lng: i.location!.lng,
      }));
  }

  async findOne(id: string) {
    return this.prisma.item.findUnique({
      where: { id: Number(id) },
      include: {
        location: true,
        prices: true,
        contacts: true,
        images: true,
      },
    });
  }
}
