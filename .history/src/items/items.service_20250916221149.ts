// src/items/items.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CrmService } from "../crm/crm.service";

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private crmService: CrmService
  ) {}

  async findAll(filters: any) {
    const lang = filters.lang || "ua"; // по умолчанию украинский
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 10;
    const skip = (page - 1) * limit;
    const requestedCurrency = filters.currency || "USD";
    const where: any = {};

    // --- Item ---
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.deal) where.deal = filters.deal;
    if (filters.category) {
      where.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }
    if (filters.isOutOfCity !== undefined) {
      where.isOutOfCity = filters.isOutOfCity === "true";
    }
    if (filters.isNewBuilding !== undefined) {
      where.isNewBuilding = filters.isNewBuilding === "true";
    }

    // --- Location ---
    const itemConditions: any[] = [];

    // --- Location ---
    if (filters.borough || filters.street || filters.city || filters.district) {
      const locationConditions: any[] = [];

      if (filters.borough) {
        const boroughs = String(filters.borough).split(",");
        locationConditions.push(
          ...boroughs.map((b) => ({
            borough: { contains: b.trim(), mode: "insensitive" },
          }))
        );
      }

      if (filters.street) {
        const streets = String(filters.street).split(",");
        locationConditions.push({
          street: { in: streets },
        });
        locationConditions.push({
          streetEn: { in: streets },
        });
      }

      if (filters.city) {
        const cities = String(filters.city).split(",");
        locationConditions.push({
          city: { in: cities },
        });
      }

      if (filters.district) {
        const districts = String(filters.district).split(",");
        locationConditions.push({
          district: { in: districts, mode: "insensitive" },
        });
      }

      itemConditions.push({ location: { is: { OR: locationConditions } } });
    }

    // --- Polygon (BBox) ---
    if (filters.polygon) {
      const coords = filters.polygon.split(",").map(Number);

      if (coords.length >= 8) {
        const lats: number[] = [];
        const lngs: number[] = [];

        for (let i = 0; i < coords.length; i += 2) {
          lngs.push(coords[i]); // X → lng
          lats.push(coords[i + 1]); // Y → lat
        }

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        itemConditions.push({
          location: {
            is: {
              lat: { gte: minLat, lte: maxLat },
              lng: { gte: minLng, lte: maxLng },
            },
          },
        });
      }
    }

    // --- Metro ---
    if (filters["metros.name"]) {
      const metros = String(filters["metros.name"]).split(",");
      itemConditions.push({
        metros: {
          some: {
            OR: metros.map((m) => ({
              name: { contains: m.trim(), mode: "insensitive" },
            })),
          },
        },
      });
    }

    // --- Newbuildings ---
    if (filters.newbuildings) {
      const buildings = String(filters.newbuildings).split(",");
      itemConditions.push({
        newbuildingName: { in: buildings.map((b) => b.trim()) },
        newbuildingNameEn: { in: buildings.map((b) => b.trim()) },
      });
    }

    // --- объединяем через OR ---
    if (itemConditions.length > 0) {
      where.OR = itemConditions;
    }

    // --- Price ---
    if (filters["prices.value_min"] || filters["prices.value_max"]) {
      const priceMin = filters["prices.value_min"]
        ? await this.crmService.toUsd(
            Number(filters["prices.value_min"]),
            filters["currency"] || "USD"
          )
        : undefined;
      const priceMax = filters["prices.value_max"]
        ? await this.crmService.toUsd(
            Number(filters["prices.value_max"]),
            filters["currency"] || "USD"
          )
        : undefined;

      const priceWhere: any = {};
      if (priceMin !== undefined) priceWhere.gte = priceMin;
      if (priceMax !== undefined) priceWhere.lte = priceMax;
      console.log(priceMax, priceMin);
      where.prices = { some: { priceUsd: priceWhere } }; // или valueUsd, если у тебя есть отдельное поле
    }

    const charConditions: any[] = [];

    // --- диапазоны ---
    if (
      filters["characteristics.floor_min"] ||
      filters["characteristics.floor_max"]
    ) {
      const cond: any = { key: "floor" };
      cond.valueNumeric = {};
      if (filters["characteristics.floor_min"]) {
        cond.valueNumeric.gte = Number(filters["characteristics.floor_min"]);
      }
      if (filters["characteristics.floor_max"]) {
        cond.valueNumeric.lte = Number(filters["characteristics.floor_max"]);
      }
      charConditions.push(cond);
    }

    if (
      filters["characteristics.area_total_min"] ||
      filters["characteristics.area_total_max"]
    ) {
      const cond: any = { key: "area_total" };
      cond.valueNumeric = {};
      if (filters["characteristics.area_total_min"]) {
        cond.valueNumeric.gte = Number(
          filters["characteristics.area_total_min"]
        );
      }
      if (filters["characteristics.area_total_max"]) {
        cond.valueNumeric.lte = Number(
          filters["characteristics.area_total_max"]
        );
      }
      charConditions.push(cond);
    }

    // --- ремонт ---
    if (filters["characteristics.renovation"]) {
      const renovations = String(filters["characteristics.renovation"]).split(
        ","
      );
      charConditions.push({
        key: "Ремонт",
        value: { in: renovations.map((r) => r.trim()) },
      });
    }

    // --- комнаты ---
    if (filters["characteristics.room_count"]) {
      const values = String(filters["characteristics.room_count"]).split(",");
      charConditions.push({
        key: "room_count",
        value: { in: values },
      });
    }

    // --- итог ---
    if (charConditions.length > 0) {
      where.AND = charConditions.map((cond) => ({
        characteristics: { some: cond },
      }));
    }
    console.log("where");
    console.log("where:", where);
    // --- Query ---
    const items = await this.prisma.item.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        location: true,
        characteristics: true,
        prices: true,
        images: true,
        contacts: true,
        metros: true,
      },
    });

    return {
      items: items.map((item) => {
        // выбираем поля в зависимости от языка
        const getField = (
          field?: string | null,
          fieldEn?: string | null
        ): string => (lang === "en" ? (fieldEn ?? field ?? "") : (field ?? ""));

        const rooms =
          item.characteristics.find((c) => c.key === "room_count")?.value ??
          null;
        const area =
          item.characteristics.find((c) => c.key === "area_total")?.value ??
          null;

        const prices = item.prices.map((p) => {
          if (requestedCurrency === "USD") {
            return { value: p.priceUsd ?? p.value, currency: "USD" };
          } else if (requestedCurrency === "UAH") {
            const usdRate = this.crmService.exchangeRatesCache["USD"].rate;
            return {
              value:
                Math.round(((p.priceUsd ?? p.value) * usdRate) / 1000) * 1000,
              currency: "UAH",
            };
          } else {
            return { value: p.value, currency: p.currency };
          }
        });

        return {
          id: String(item.id),
          crmId: item.crmId,
          title: getField(item.title, item.titleEn),
          description: getField(item.description, item.descriptionEn),
          type: getField(item.type, item.typeEn),
          deal: getField(item.deal, item.dealEn),
          category: getField(item.category, item.categoryEn),
          newbuildingName: getField(
            item.newbuildingName,
            item.newbuildingNameEn
          ),
          street: getField(item.location?.street, item.location?.streetEn),
          district: getField(
            item.location?.district,
            item.location?.districtEn
          ),
          city: getField(item.location?.city, item.location?.cityEn),
          prices,
          rooms,
          area,
          firstImage: item.images?.[0]?.url || null,
          contacts: item.contacts,
          lat: item.location?.lat ?? null,
          lng: item.location?.lng ?? null,
          metros: item.metros.map((m) =>
            lang === "en" ? (m.nameEn ?? m.name) : m.name
          ),
          updatedAt: item.updatedAt ?? null,
        };
      }),
      total: await this.prisma.item.count({ where }),
    };
  }
  async getCoordinates(filters: any) {
    const requestedCurrency = filters.currency || "USD";
    const where: any = {};

    // --- Item ---
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.deal) where.deal = filters.deal;
    if (filters.category) {
      where.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }
    if (filters.isOutOfCity !== undefined) {
      where.isOutOfCity = filters.isOutOfCity === "true";
    }
    if (filters.isNewBuilding !== undefined) {
      where.isNewBuilding = filters.isNewBuilding === "true";
    }

    // --- Location ---
    const itemConditions: any[] = [];

    // --- Location ---
    if (filters.borough || filters.street || filters.city || filters.district) {
      const locationConditions: any[] = [];

      if (filters.borough) {
        const boroughs = String(filters.borough).split(",");
        locationConditions.push(
          ...boroughs.map((b) => ({
            borough: { contains: b.trim(), mode: "insensitive" },
          }))
        );
      }

      if (filters.street) {
        const streets = String(filters.street).split(",");
        locationConditions.push({
          street: { in: streets },
        });
        locationConditions.push({
          streetEn: { in: streets },
        });
      }

      if (filters.city) {
        const cities = String(filters.city).split(",");
        locationConditions.push({
          city: { in: cities },
        });
      }

      if (filters.district) {
        const districts = String(filters.district).split(",");
        locationConditions.push({
          district: { in: districts, mode: "insensitive" },
        });
      }

      itemConditions.push({ location: { is: { OR: locationConditions } } });
    }

    // --- Polygon (BBox) ---
    if (filters.polygon) {
      const coords = filters.polygon.split(",").map(Number);

      if (coords.length >= 8) {
        const lats: number[] = [];
        const lngs: number[] = [];

        for (let i = 0; i < coords.length; i += 2) {
          lngs.push(coords[i]); // X → lng
          lats.push(coords[i + 1]); // Y → lat
        }

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        itemConditions.push({
          location: {
            is: {
              lat: { gte: minLat, lte: maxLat },
              lng: { gte: minLng, lte: maxLng },
            },
          },
        });
      }
    }

    // --- Metro ---
    if (filters["metros.name"]) {
      const metros = String(filters["metros.name"]).split(",");
      itemConditions.push({
        metros: {
          some: {
            OR: metros.map((m) => ({
              name: { contains: m.trim(), mode: "insensitive" },
            })),
          },
        },
      });
    }

    // --- Newbuildings ---
    if (filters.newbuildings) {
      const buildings = String(filters.newbuildings).split(",");
      itemConditions.push({
        newbuildingName: { in: buildings.map((b) => b.trim()) },
      });
      itemConditions.push({
        newbuildingNameEn: { in: buildings.map((b) => b.trim()) },
      });
    }

    // --- объединяем через OR ---
    if (itemConditions.length > 0) {
      where.OR = itemConditions;
    }

    // --- Price ---
    if (filters["prices.value_min"] || filters["prices.value_max"]) {
      const priceMin = filters["prices.value_min"]
        ? await this.crmService.toUsd(
            Number(filters["prices.value_min"]),
            filters["currency"] || "USD"
          )
        : undefined;
      const priceMax = filters["prices.value_max"]
        ? await this.crmService.toUsd(
            Number(filters["prices.value_max"]),
            filters["currency"] || "USD"
          )
        : undefined;

      const priceWhere: any = {};
      if (priceMin !== undefined) priceWhere.gte = priceMin;
      if (priceMax !== undefined) priceWhere.lte = priceMax;
      console.log(priceMax, priceMin);
      where.prices = { some: { priceUsd: priceWhere } }; // или valueUsd, если у тебя есть отдельное поле
    }

    const charConditions: any[] = [];

    // --- диапазоны ---
    if (
      filters["characteristics.floor_min"] ||
      filters["characteristics.floor_max"]
    ) {
      const cond: any = { key: "floor" };
      cond.valueNumeric = {};
      if (filters["characteristics.floor_min"]) {
        cond.valueNumeric.gte = Number(filters["characteristics.floor_min"]);
      }
      if (filters["characteristics.floor_max"]) {
        cond.valueNumeric.lte = Number(filters["characteristics.floor_max"]);
      }
      charConditions.push(cond);
    }

    if (
      filters["characteristics.area_total_min"] ||
      filters["characteristics.area_total_max"]
    ) {
      const cond: any = { key: "area_total" };
      cond.valueNumeric = {};
      if (filters["characteristics.area_total_min"]) {
        cond.valueNumeric.gte = Number(
          filters["characteristics.area_total_min"]
        );
      }
      if (filters["characteristics.area_total_max"]) {
        cond.valueNumeric.lte = Number(
          filters["characteristics.area_total_max"]
        );
      }
      charConditions.push(cond);
    }

    // --- ремонт ---
    if (filters["characteristics.renovation"]) {
      const renovations = String(filters["characteristics.renovation"]).split(
        ","
      );
      charConditions.push({
        key: "Ремонт",
        value: { in: renovations.map((r) => r.trim()) },
      });
    }

    // --- комнаты ---
    if (filters["characteristics.room_count"]) {
      const values = String(filters["characteristics.room_count"]).split(",");
      charConditions.push({
        key: "room_count",
        value: { in: values },
      });
    }

    // --- итог ---
    if (charConditions.length > 0) {
      where.AND = charConditions.map((cond) => ({
        characteristics: { some: cond },
      }));
    }
    console.log("хуй");
    // --- Query ---s
    const items = await this.prisma.item.findMany({
      where,
      select: {
        id: true,
        crmId: true,
        location: { select: { lat: true, lng: true } },
      },
    });

    return items.map((item) => ({
      id: String(item.id),
      crmId: item.crmId,
      lat: item.location?.lat ?? null,
      lng: item.location?.lng ?? null,
    }));
  }

  async findOne(id: string, lang: string = "ua") {
    const item = await this.prisma.item.findFirst({
      where: {
        OR: [{ id: Number(id) }],
      },
      include: {
        location: true,
        prices: true,
        contacts: true,
        images: true,
        characteristics: true,
      },
    });

    if (!item) return null;

    // Сопоставление ключей с украинскими названиями
    const charMap: Record<string, string> = {
      room_count: "Кількість кімнат",
      area_total: "Загальна площа",
      total_floors: "Загальна кількість поверхів",
      floor: "Поверх",

      area_kitchen: "Площа кухні",
      area_living: "Площа житлова",
      area_land: "Площа землі",

      Ремонт: "Ремонт",
      "Тип будівлі": "Тип будівлі",
      "Рік вводу в експлуатацію": "Рік вводу в експлуатацію",
      Будинок: "Будинок",
      Напрямок: "Напрямок",
      "Посилання на відео": "Посилання на відео",
      поверх: "Поверх",
    };

    const characteristics: Record<string, any> = {};

    for (const [dbKey, ukrLabel] of Object.entries(charMap)) {
      const char = item.characteristics.find((c) => c.key === dbKey);
      characteristics[ukrLabel] = char ? char.value : null;
    }
    console.log(item.id);
    return {
      id: String(item.id),
      crmId: item.crmId,
      title: lang === "ua" ? item.title : (item.titleEn ?? ""),
      description:
        lang === "ua" ? item.description : (item.descriptionEn ?? ""),
      type: item.type ?? "",
      deal: item.deal ?? "",
      location: item.location ?? null,
      prices: item.prices ?? [],
      contacts: item.contacts ?? [],
      images: item.images ?? [],
      characteristics,
    };
  }

  async getLocation(filters?: { lang?: string }) {
    const lang = filters?.lang || "ua"; // по умолчанию украинский
    console.log("lang:", lang);
    const getField = (field?: string | null, fieldEn?: string | null) =>
      lang === "en" ? (fieldEn ?? field ?? "") : (field ?? "");

    // Улицы по Киеву
    const kyivStreets = await this.prisma.location.findMany({
      select: { street: true, streetEn: true },
      where: {
        street: { not: null },
        item: { isOutOfCity: false },
      },
      distinct: ["street"],
      orderBy: { street: "asc" },
    });

    // Улицы по области
    const regionStreets = await this.prisma.location.findMany({
      select: { street: true, streetEn: true },
      where: {
        street: { not: null },
        item: { isOutOfCity: true },
      },
      distinct: ["street"],
      orderBy: { street: "asc" },
    });

    // ЖК по Киеву
    const kyivNewbuildings = await this.prisma.item.findMany({
      select: { newbuildingName: true, newbuildingNameEn: true },
      where: { newbuildingName: { not: null }, isOutOfCity: false },
      distinct: ["newbuildingName"],
      orderBy: { newbuildingName: "asc" },
    });

    // ЖК по области
    const regionNewbuildings = await this.prisma.item.findMany({
      select: { newbuildingName: true, newbuildingNameEn: true },
      where: { newbuildingName: { not: null }, isOutOfCity: true },
      distinct: ["newbuildingName"],
      orderBy: { newbuildingName: "asc" },
    });

    // Направления по области
    const regionDirections = await this.prisma.location.findMany({
      select: { county: true, countyEn: true },
      where: {
        county: { not: null },
        item: { isOutOfCity: true },
      },
      distinct: ["county"],
      orderBy: { county: "asc" },
    });

    return {
      kyiv: {
        streets: kyivStreets.map((s) => getField(s.street, s.streetEn)),
        newbuildings: kyivNewbuildings.map((n) =>
          getField(n.newbuildingName, n.newbuildingNameEn)
        ),
      },
      region: {
        streets: regionStreets.map((s) => getField(s.street, s.streetEn)),
        newbuildings: regionNewbuildings.map((n) =>
          getField(n.newbuildingName, n.newbuildingNameEn)
        ),
        directions: regionDirections.map((d) => getField(d.county, d.countyEn)),
      },
    };
  }
}
