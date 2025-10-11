import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CrmService } from "../crm/crm.service";
import { Item } from "@prisma/client";

// Создаем тип, который соответствует полям, выбираемым для админки
type AdminItem = {
  id: number;
  crmId: string;
  title: string | null;
  titleEn: string | null;
  status: string | null;
  isNewBuilding: boolean | null;
  isOutOfCity: boolean | null;
};

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private crmService: CrmService
  ) {}

  async findAll(filters: any) {
    if (filters.q) filters.search = filters.q;

    const lang = filters.lang || "ua";
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 10;
    const skip = (page - 1) * limit;
    const requestedCurrency = filters.currency || "USD";

    const andConditions: any[] = [];
    const where: any = {};

    // --- Базовые фильтры (AND) ---
    if (filters.status) andConditions.push({ status: filters.status });
    if (filters.type) andConditions.push({ type: filters.type });
    if (filters.deal) andConditions.push({ deal: filters.deal });

    // --- Search conditions ---
    let relevanceOrder = undefined;
    if (filters.search) {
      const searchTerm = filters.search.trim().toLowerCase();

      // Используем raw filter для PostgreSQL full-text search (или LIKE как fallback)
      const searchClause = {
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          { titleEn: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
          { descriptionEn: { contains: searchTerm, mode: "insensitive" } },
          { newbuildingName: { contains: searchTerm, mode: "insensitive" } },
          { newbuildingNameEn: { contains: searchTerm, mode: "insensitive" } },
          {
            location: {
              is: {
                OR: [
                  { street: { contains: searchTerm, mode: "insensitive" } },
                  { streetEn: { contains: searchTerm, mode: "insensitive" } },
                  { district: { contains: searchTerm, mode: "insensitive" } },
                  { districtEn: { contains: searchTerm, mode: "insensitive" } },
                  { city: { contains: searchTerm, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      };

      andConditions.push(searchClause);

      // Для приоритетной сортировки
      // Можно использовать _relevance (PostgreSQL) или создать "score" через raw SQL
      relevanceOrder = {
        _relevance: {
          fields: ["title", "description", "newbuildingName"],
          search: searchTerm,
          sort: "desc",
        },
      };
    }

    if (andConditions.length > 0) where.AND = andConditions;

    // --- Сортировка ---
    let orderBy: any = relevanceOrder ?? { updatedAt: "desc" }; // сначала relevance, если есть search
    if (filters.sort) {
      switch (filters.sort) {
        case "newest":
          orderBy = { updatedAt: "desc" };
          break;
        case "oldest":
          orderBy = { updatedAt: "asc" };
          break;
        case "price_asc":
          orderBy = { prices: { priceUsd: "asc" } };
          break;
        case "price_desc":
          orderBy = { prices: { priceUsd: "desc" } };
          break;
      }
    }

    const items = await this.prisma.item.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
      items: items.map((item) => ({
        id: String(item.id),
        title: lang === "en" ? (item.titleEn ?? item.title) : item.title,
        description:
          lang === "en"
            ? (item.descriptionEn ?? item.description)
            : item.description,
        newbuildingName:
          lang === "en"
            ? (item.newbuildingNameEn ?? item.newbuildingName)
            : item.newbuildingName,
        street:
          lang === "en"
            ? (item.location?.streetEn ?? item.location?.street)
            : item.location?.street,
        district:
          lang === "en"
            ? (item.location?.districtEn ?? item.location?.district)
            : item.location?.district,
        city: item.location?.city,
        prices: item.prices,
        characteristics: item.characteristics,
        images: item.images,
        contacts: item.contacts,
        metros: item.metros.map((m) => m.name),
        updatedAt: item.updatedAt,
      })),
      total: await this.prisma.item.count({ where }),
    };
  }

  async getCoordinates(filters: any) {
    // === ИСПРАВЛЕНИЕ ОШИБКИ ПОИСКА (ДОБАВЛЕНО) ===
    // Если запрос пришел с 'q' (глобальный поиск), используем его как 'search'
    if (filters.q) {
      filters.search = filters.q;
    }
    // =============================================

    const lang = filters.lang || "ua"; // по умолчанию украинский
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 10;
    const skip = (page - 1) * limit;
    const requestedCurrency = filters.currency || "USD";

    // Используем массив для всех AND-условий, чтобы управлять фильтрами
    const andConditions: any[] = [];
    const where: any = {};

    // --- Item (Базовые AND-условия) ---
    // Собираем базовые фильтры, которые всегда применяются через AND
    const baseFilters: any = {};

    if (filters.status) baseFilters.status = filters.status;
    if (filters.type) baseFilters.type = filters.type;
    if (filters.deal) baseFilters.deal = filters.deal;
    if (filters.category) {
      baseFilters.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }
    if (filters.isOutOfCity !== undefined) {
      baseFilters.isOutOfCity = filters.isOutOfCity === "false";
    }
    if (filters.isNewBuilding !== undefined) {
      baseFilters.isNewBuilding = filters.isNewBuilding === "true";
    }

    // Добавляем базовые фильтры в AND-условия, если они есть
    const filteredBaseFilters = Object.fromEntries(
      Object.entries(baseFilters).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(filteredBaseFilters).length > 0) {
      andConditions.push(filteredBaseFilters);
    }

    // --- Условия, которые объединяются через OR (включая поиск и локацию) ---
    const itemConditions: any[] = [];

    // --- Global Search (text) ---
    if (filters.search) {
      const searchTerm = filters.search.trim();
      const searchClauses: any[] = [
        // Поиск по заголовкам
        { title: { contains: searchTerm, mode: "insensitive" } },
        { titleEn: { contains: searchTerm, mode: "insensitive" } },
        // Поиск по описанию
        { description: { contains: searchTerm, mode: "insensitive" } },
        { descriptionEn: { contains: searchTerm, mode: "insensitive" } },
        // Поиск по названию ЖК
        { newbuildingName: { contains: searchTerm, mode: "insensitive" } },
        { newbuildingNameEn: { contains: searchTerm, mode: "insensitive" } },
        // Поиск по локации (улица, район, город)
        {
          location: {
            is: {
              OR: [
                { street: { contains: searchTerm, mode: "insensitive" } },
                { streetEn: { contains: searchTerm, mode: "insensitive" } },
                { district: { contains: searchTerm, mode: "insensitive" } },
                { districtEn: { contains: searchTerm, mode: "insensitive" } },
                { city: { contains: searchTerm, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
      itemConditions.push({ OR: searchClauses }); // Оборачиваем searchClauses в OR
    }

    // --- Location (borough, street, city, district) ---
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
      itemConditions.push(
        { newbuildingName: { in: buildings.map((b) => b.trim()) } },
        { newbuildingNameEn: { in: buildings.map((b) => b.trim()) } }
      );
    }

    // --- ✅ ИСПРАВЛЕНИЕ: Объединяем OR-условия с AND-условиями ---
    if (itemConditions.length > 0) {
      andConditions.push({ OR: itemConditions });
    }

    // --- Price (AND-условие) ---
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
      andConditions.push({ prices: { is: { priceUsd: priceWhere } } }); // Добавляем в общий AND
    }

    const charConditions: any[] = [];

    // --- диапазоны (AND-условия) ---
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

    // --- ремонт (AND-условие) ---
    if (filters["characteristics.renovation"]) {
      const renovations = String(filters["characteristics.renovation"]).split(
        ","
      );
      charConditions.push({
        key: "Ремонт",
        value: { in: renovations.map((r) => r.trim()) },
      });
    }

    // --- комнаты (AND-условие) ---
    if (filters["characteristics.room_count"]) {
      const values = String(filters["characteristics.room_count"]).split(",");
      charConditions.push({
        key: "room_count",
        value: { in: values },
      });
    }

    // --- итог характеристики (AND-условие) ---
    if (charConditions.length > 0) {
      andConditions.push(
        ...charConditions.map((cond) => ({
          characteristics: { some: cond },
        }))
      );
    }

    // --- ✅ Применяем все собранные AND-условия к where ---
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    console.log("хуйня где:", where);
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
      where: { OR: [{ slug: id }] },
      include: {
        location: true,
        prices: true,
        contacts: true,
        images: true,
        characteristics: true,
      },
    });

    if (!item) return null;

    // Карта ключей для украинского и английского
    const charMap: Record<string, { ua: string; en: string }> = {
      room_count: { ua: "Кількість кімнат", en: "Rooms" },
      area_total: { ua: "Загальна площа", en: "Total area" },
      total_floors: { ua: "Загальна кількість поверхів", en: "Total floors" },
      floor: { ua: "Поверх", en: "Floor" },
      area_kitchen: { ua: "Площа кухні", en: "Kitchen area" },
      area_living: { ua: "Площа житлова", en: "Living area" },
      area_land: { ua: "Площа землі", en: "Land area" },
      Ремонт: { ua: "Ремонт", en: "Renovation" },
      "Тип будівлі": { ua: "Тип будівлі", en: "Building type" },
      "Рік вводу в експлуатацію": {
        ua: "Рік вводу в експлуатацію",
        en: "Commissioned year",
      },
      Будинок: { ua: "Будинок", en: "Building" },
      Напрямок: { ua: "Напрямок", en: "Direction" },
      "Посилання на відео": { ua: "Посилання на відео", en: "Video link" },
      поверх: { ua: "Поверх", en: "Floor" },
    };

    const characteristics: Record<string, any> = {};

    for (const [dbKey, labels] of Object.entries(charMap)) {
      const char = item.characteristics.find((c) => c.key === dbKey);

      if (lang === "ua") {
        characteristics[labels.ua] = char ? char.value : null;
      } else {
        characteristics[labels.en] = char ? (char.valueEn ?? char.value) : null;
      }
    }

    // Локализация location
    let location = null;
    if (item.location) {
      location = {
        country: item.location.country ?? "",
        region: item.location.region ?? "",
        city: item.location.city ?? "",
        county:
          lang === "ua"
            ? item.location.county
            : (item.location.countyEn ?? item.location.county),
        borough:
          lang === "ua"
            ? item.location.borough
            : (item.location.boroughEn ?? item.location.borough),
        district:
          lang === "ua"
            ? item.location.district
            : (item.location.districtEn ?? item.location.district),
        street:
          lang === "ua"
            ? item.location.street
            : (item.location.streetEn ?? item.location.street),
        streetType: item.location.streetType ?? "",
        lat: item.location.lat ?? null,
        lng: item.location.lng ?? null,
      };
    }

    return {
      id: String(item.id),
      crmId: item.crmId,
      title: lang === "ua" ? item.title : (item.titleEn ?? item.title),
      description:
        lang === "ua"
          ? item.description
          : (item.descriptionEn ?? item.description),
      type: lang === "ua" ? item.type : (item.typeEn ?? item.type),
      deal: item.deal ?? "",
      location,
      prices: item.prices ?? [],
      images: item.images ?? [],
      characteristics,
      contacts: item.contacts ?? [],
      article: item.article,
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
        item: { isOutOfCity: true },
      },
      distinct: ["street"],
      orderBy: { street: "asc" },
    });

    // Улицы по области
    const regionStreets = await this.prisma.location.findMany({
      select: { street: true, streetEn: true },
      where: {
        street: { not: null },
        item: { isOutOfCity: false },
      },
      distinct: ["street"],
      orderBy: { street: "asc" },
    });

    // ЖК по Киеву
    const kyivNewbuildings = await this.prisma.item.findMany({
      select: { newbuildingName: true, newbuildingNameEn: true },
      where: { newbuildingName: { not: null }, isOutOfCity: true },
      distinct: ["newbuildingName"],
      orderBy: { newbuildingName: "asc" },
    });

    // ЖК по области
    const regionNewbuildings = await this.prisma.item.findMany({
      select: { newbuildingName: true, newbuildingNameEn: true },
      where: { newbuildingName: { not: null }, isOutOfCity: false },
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

  /**
   * Возвращает список всех объектов недвижимости для админки.
   * @returns Массив объектов AdminItem.
   */
  async getAllItemsForAdmin(): Promise<AdminItem[]> {
    return this.prisma.item.findMany({
      select: {
        id: true,
        crmId: true,
        title: true,
        titleEn: true,
        status: true,
        isNewBuilding: true,
        isOutOfCity: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
