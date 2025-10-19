// src/crm/crm.service.ts
import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as xml2js from "xml2js";
import { CrmItemDto } from "./dto/crm-item.dto";
import { PrismaService } from "../prisma/prisma.service";
import { TranslateService } from "../translate/translate.service";

@Injectable()
export class CrmService {
  private dailyFeedUrl =
    "https://crm-myspace.realtsoft.net/feed/json?id=3&updates=day";
  private fullFeedUrl =
    "https://crm-myspace.realtsoft.net/feed/json?id=3&updates=all";

  private lastFullSync = 0;

  constructor(
    private prisma: PrismaService,
    private translateService: TranslateService // <--
  ) {
    // Запускаем периодическую проверку каждые N секунд
    this.startAutoTranslate();
  }
  private dtoContainer: CrmItemDto[] = [];

  exchangeRatesCache: {
    [currency: string]: { rate: number; lastUpdated: number };
  } = {
    USD: { rate: 1, lastUpdated: 0 }, // доллар по умолчанию
    EUR: { rate: 0, lastUpdated: 0 }, // евро будет подтягиваться
    UAH: { rate: 0, lastUpdated: 0 }, // гривна будет подтягиваться
  };

  private async updateRates(): Promise<void> {
    const now = Date.now();
    // обновляем раз в час
    for (const currency of ["USD", "EUR", "UAH"]) {
      if (
        now - (this.exchangeRatesCache[currency]?.lastUpdated || 0) >
        60 * 60 * 1000
      ) {
        try {
          const res = await axios.get(
            `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${currency}&json`
          );
          const rate = res.data?.[0]?.rate;
          if (rate) {
            this.exchangeRatesCache[currency] = { rate, lastUpdated: now };
          }
        } catch (e: any) {
          console.error(
            `Ошибка получения курса ${currency} от НБУ:`,
            e.message
          );
        }
      }
    }
  }

  // конвертирует любую валюту в USD
  async toUsd(value: number, currency: string): Promise<number> {
    if (currency === "USD") return Math.round(value * 100) / 100;

    await this.updateRates();

    let result = value;

    if (currency === "UAH") {
      result = value / this.exchangeRatesCache["USD"].rate; // UAH → USD
    } else if (currency === "EUR") {
      const eurRate = this.exchangeRatesCache["EUR"].rate; // EUR → UAH
      const usdRate = this.exchangeRatesCache["USD"].rate; // USD → UAH
      result = (value * eurRate) / usdRate; // EUR → USD
    }

    // округление до двух знаков после запятой
    return Math.round(result * 100) / 100;
  }

  public pushDto(dto: CrmItemDto | CrmItemDto[]) {
    if (Array.isArray(dto)) {
      this.dtoContainer.push(...dto);
    } else {
      this.dtoContainer.push(dto);
    }
  }

  private async startAutoTranslate() {
    const interval = 5000; // пауза между проверками

    const checkAndTranslate = async () => {
      if (this.dtoContainer.length === 0) {
        setTimeout(checkAndTranslate, interval);
        return;
      }

      try {
        await this.translateAndSave();
      } catch (err) {
        console.error("Ошибка при автоматическом переводе:", err);
      }

      // ждём перед следующей проверкой
      setTimeout(checkAndTranslate, interval);
    };

    // запускаем первый раз
    checkAndTranslate();
  }

  private async translateAndSave(): Promise<void> {
    if (!this.dtoContainer.length) {
      return;
    }

    for (const dto of this.dtoContainer) {
      // Проверяем, есть ли что переводить
      const hasTextToTranslate =
        dto.title ||
        dto.description ||
        dto.deal ||
        dto.type ||
        dto.category ||
        dto.newbuilding_name ||
        (dto.location &&
          (dto.location.country ||
            dto.location.region ||
            dto.location.city ||
            dto.location.county ||
            dto.location.borough ||
            dto.location.district ||
            dto.location.street ||
            dto.location.street_type)) ||
        (dto.location?.metros?.length ?? 0) > 0 ||
        (dto.characteristics && Object.keys(dto.characteristics).length > 0);

      if (!hasTextToTranslate) continue;

      // Перевод основных полей
      const [titleEn, descriptionEn, typeEn, newbuildingNameEn] =
        await Promise.all([
          dto.title ? this.translateService.translateText(dto.title, "en") : "",
          dto.description
            ? this.translateService.translateText(dto.description, "en")
            : "",
          dto.type ? this.translateService.translateText(dto.type, "en") : "",

          dto.newbuilding_name
            ? this.translateService.translateText(dto.newbuilding_name, "en")
            : "",
        ]);

      // Перевод локации
      const locationEn: Partial<Record<string, string>> = {};
      if (dto.location) {
        const locFields: (keyof typeof dto.location)[] = [
          "county",
          "borough",
          "district",
          "street",
        ];
        const mapField = (f: string) =>
          f === "street_type" ? "streetType" : f;

        await Promise.all(
          locFields.map(async (f) => {
            const value = dto.location?.[f];
            if (typeof value === "string" && value.trim()) {
              const key = mapField(f) + "En";
              locationEn[key] = await this.translateService.translateText(
                value,
                "en"
              );
            }
          })
        );
      }

      // Метро

      // Характеристики
      const characteristicsWithTranslations = await Promise.all(
        [
          ...Object.entries(dto.characteristics || {})
            .filter(
              ([key]) =>
                key !== "extra" && dto.characteristics[key] !== undefined
            )
            .map(([key, value]) => ({ key, value: String(value) })),
          ...(dto.characteristics?.extra?.map((e) => ({
            key: e.label,
            value: e.value,
          })) || []),
        ].map(async (c) => ({
          key: c.key,

          valueEn: c.value
            ? await this.translateService.translateText(c.value, "en")
            : "",
        }))
      );

      // Сохраняем переводы
      await this.prisma.item.update({
        where: { crmId: dto.id },
        data: {
          titleEn,
          descriptionEn,
          typeEn,
          newbuildingNameEn,
          location: dto.location
            ? {
                update: locationEn,
              }
            : undefined,

          characteristics: {
            updateMany: characteristicsWithTranslations.map((c) => ({
              where: { key: c.key, itemId: Number(dto.id) },
              data: { valueEn: c.valueEn },
            })),
          },
        },
      });
    }

    // очищаем контейнер после перевода
    this.dtoContainer = [];
  }

  private generateSlug(title: string, id: number): string {
    const map: { [key: string]: string } = {
      а: "a",
      б: "b",
      в: "v",
      г: "g",
      д: "d",
      е: "e",
      ё: "e",
      ж: "zh",
      з: "z",
      и: "i",
      й: "y",
      к: "k",
      л: "l",
      м: "m",
      н: "n",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ф: "f",
      х: "kh",
      ц: "ts",
      ч: "ch",
      ш: "sh",
      щ: "shch",
      ъ: "",
      ы: "y",
      ь: "",
      э: "e",
      ю: "yu",
      я: "ya",
      А: "A",
      Б: "B",
      В: "V",
      Г: "G",
      Д: "D",
      Е: "E",
      Ё: "E",
      Ж: "Zh",
      З: "Z",
      И: "I",
      Й: "Y",
      К: "K",
      Л: "L",
      М: "M",
      Н: "N",
      О: "O",
      П: "P",
      Р: "R",
      С: "S",
      Т: "T",
      У: "U",
      Ф: "F",
      Х: "Kh",
      Ц: "Ts",
      Ч: "Ch",
      Ш: "Sh",
      Щ: "Shch",
      Ъ: "",
      Ы: "Y",
      Ь: "",
      Э: "E",
      Ю: "Yu",
      Я: "Ya",
      і: "i",
      ї: "yi",
      є: "ye",
      ґ: "g",
      І: "I",
      Ї: "Yi",
      Є: "Ye",
      Ґ: "G",
    };

    const transliterate = (text: string) =>
      text
        .split("")
        .map((c) => map[c] || c)
        .join("");

    const slugBase = transliterate(title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-");

    return `${id}-${slugBase}`;
  }

  async startScheduler() {
    const intervalMs = 60 * 1000; // 1 минута
    let oneParse = true;

    const run = async () => {
      try {
        const now = new Date();
        const hours = now.getHours() + 3;

        const isNightTime = hours === 3 && oneParse;
        if (isNightTime) {
          console.log("Старт глобального парсера");
          await this.syncData(this.fullFeedUrl, true);
          console.log("✅ Полная синхронизация CRM завершена");
          oneParse = false;
        } else {
          await this.syncData(this.dailyFeedUrl, false);
          console.log("Парсим каждую минуту", hours);
          if (hours !== 3) oneParse = true;
        }
      } catch (e: any) {
        console.error("❌ Ошибка синхронизации CRM:", e.message);
      } finally {
        setTimeout(run, intervalMs);
      }
    };

    run();
  }

  /**
   * 🔄 Синхронизация данных с CRM
   */
  async syncData(url: string, isFullSync: boolean): Promise<void> {
    const response = await axios.get(url, { timeout: 30000 });
    const data = response.data;

    if (!data || !Array.isArray(data.estates)) {
      console.error("⚠️ Некорректный формат: нет массива 'estates'");
      return;
    }

    const items = data.estates.map((item: any) => item);

    const seenCrmIds: string[] = [];

    for (const raw of items) {
      const dto = this.mapJsonItemToDto(raw);

      seenCrmIds.push(dto.id);

      const filteredImages = dto.images.filter((url): url is string => !!url);

      // 2️⃣ Берём существующие URL для текущего item
      const existingImages = await this.prisma.image.findMany({
        where: { item: { crmId: dto.id } },
        select: { url: true },
      });

      const existingUrls = new Set(existingImages.map((i) => i.url));

      // 3️⃣ Создаём массив новых изображений
      const newImages = filteredImages
        .filter((url) => !existingUrls.has(url))
        .map((url, index) => ({
          url,
          order: index,
        }));

      const priceUsd = await this.toUsd(dto.price.value, dto.price.currency);

      await this.prisma.item.upsert({
        where: { crmId: dto.id },
        update: {
          status: dto.status,
          title: dto.title,
          description: dto.description,
          deal: dto.deal,
          type: dto.type,
          isNewBuilding: Boolean(dto.is_new_building),
          isOutOfCity: dto.isOutOfCity,
          article: dto.article,
          category: dto.category,
          newbuildingName: dto.newbuilding_name,
          updatedAt: new Date(dto.updatedAt),
          location: dto.location
            ? {
                upsert: {
                  update: {
                    country: dto.location.country,
                    region: dto.location.region,
                    city: dto.location.city,
                    borough: dto.location.borough,
                    district: dto.location.district,
                    county: dto.location.county || null,
                    street: dto.location.street || null,
                    streetType: dto.location.street_type || null,
                    lat: dto.location.lat,
                    lng: dto.location.lng,
                  },
                  create: {
                    country: dto.location.country,
                    region: dto.location.region,
                    city: dto.location.city,
                    borough: dto.location.borough,
                    district: dto.location.district,
                    street: dto.location.street || null,
                    streetType: dto.location.street_type || null,
                    lat: dto.location.lat,
                    lng: dto.location.lng,
                  },
                },
              }
            : undefined,

          prices: dto.price
            ? {
                upsert: {
                  update: {
                    value: dto.price.value,
                    currency: dto.price.currency,
                    priceUsd,
                  },
                  create: {
                    value: dto.price.value,
                    currency: dto.price.currency,
                    priceUsd,
                  },
                },
              }
            : undefined,
          contacts: dto.contact
            ? {
                upsert: {
                  update: {
                    name: dto.contact.name,
                    phone: dto.contact.phone,
                    email: dto.contact.email,
                  },
                  create: {
                    name: dto.contact.name,
                    phone: dto.contact.phone,
                    email: dto.contact.email,
                  },
                },
              }
            : undefined,
          images: {
            // 1️⃣ Удаляем всё, чего нет в dto.images
            deleteMany: {
              itemId: Number(dto.id),
              NOT: {
                url: { in: dto.images.filter(Boolean) },
              },
            },

            // 2️⃣ Создаём новые, которых ещё нет в базе
            create: newImages.length
              ? newImages.map((img) => ({
                  url: img.url,
                  order: img.order,
                }))
              : undefined,
          },

          metros: {
            deleteMany: {}, // очищаем старые
            create:
              dto.location.metros?.map((m) => ({
                name: m.name,
                distance: m.distance,
              })) || [],
          },
          characteristics: {
            deleteMany: {},
            create: [
              ...Object.entries(dto.characteristics)
                .filter(
                  ([key]) =>
                    key !== "extra" && dto.characteristics[key] !== undefined
                )
                .map(([key, value]) => {
                  const num = Number(value);
                  return {
                    key,
                    value: String(value),
                    valueNumeric: isNaN(num) ? null : num,
                  };
                }),
              ...(dto.characteristics.extra?.map((e) => {
                const num = Number(e.value);
                return {
                  key: e.label,
                  value: e.value,
                  valueNumeric: isNaN(num) ? null : num,
                };
              }) || []),
            ],
          },
          slug: this.generateSlug(dto.title || "", Number(dto.id)),
        },

        create: {
          crmId: dto.id,
          status: dto.status,
          title: dto.title,
          description: dto.description,
          deal: dto.deal,
          type: dto.type,
          isNewBuilding: Boolean(dto.is_new_building),
          isOutOfCity: dto.isOutOfCity,
          article: dto.article,
          category: dto.category,
          newbuildingName: dto.newbuilding_name,
          createdAt: new Date(dto.createdAt),
          updatedAt: new Date(dto.updatedAt),
          location: dto.location
            ? {
                create: {
                  country: dto.location.country,
                  region: dto.location.region,
                  city: dto.location.city,
                  borough: dto.location.borough,
                  county: dto.location.county || null,
                  district: dto.location.district,
                  street: dto.location.street || null,
                  streetType: dto.location.street_type || null,
                  lat: dto.location.lat,
                  lng: dto.location.lng,
                },
              }
            : undefined,

          prices: dto.price
            ? {
                create: {
                  value: dto.price.value,
                  currency: dto.price.currency,
                  priceUsd,
                },
              }
            : undefined,
          contacts: dto.contact
            ? {
                create: {
                  name: dto.contact.name,
                  phone: dto.contact.phone,
                  email: dto.contact.email,
                },
              }
            : undefined,
          images: dto.images.length
            ? {
                create: dto.images.map((url, index) => ({
                  url,
                  order: index,
                })),
              }
            : undefined,
          metros: dto.location.metros?.length
            ? {
                create: dto.location.metros.map((m) => ({
                  name: m.name,
                  distance: m.distance,
                })),
              }
            : undefined,
          characteristics: {
            create: [
              // обычные характеристики
              ...Object.entries(dto.characteristics)
                .filter(
                  ([key]) =>
                    key !== "extra" && dto.characteristics[key] !== undefined
                )
                .map(([key, value]) => {
                  const num = Number(value);
                  return {
                    key,
                    value: String(value),
                    valueNumeric: isNaN(num) ? null : num,
                  };
                }),

              // extra характеристики тоже в key/value
              ...(dto.characteristics.extra?.map((e) => {
                const num = Number(e.value);
                return {
                  key: e.label,
                  value: e.value,
                  valueNumeric: isNaN(num) ? null : num,
                };
              }) || []),
            ],
          },
          slug: this.generateSlug(dto.title || "", Number(dto.id)),
        },
      });
    }

    if (isFullSync) {
      const existing = await this.prisma.item.findMany({
        select: { crmId: true },
      });
      const toDelete = existing
        .map((i) => i.crmId)
        .filter((id) => !seenCrmIds.includes(id));
      if (toDelete.length > 0) {
        await this.prisma.item.deleteMany({
          where: { crmId: { in: toDelete } },
        });
      }
    }
  }

  /**
   * 🧩 Преобразует JSON объект CRM в локальный формат
   */
  private mapJsonItemToDto(item: any): CrmItemDto {
    const getText = (field: any): string => {
      if (field == null) return "";
      if (typeof field === "string") return field.trim();
      if (typeof field === "number") return field.toString();
      return "";
    };

    const getNumber = (field: any): number | null => {
      if (field == null || field === "") return null;
      const n = parseFloat(field);
      return isNaN(n) ? null : n;
    };

    // 📸 Изображения
    const images = Array.isArray(item.images)
      ? item.images
      : item.images
        ? [item.images]
        : [];

    // 🧩 Дополнительные свойства
    const extra =
      Array.isArray(item.properties) && item.properties.length
        ? item.properties.map((p: any) => ({
            label: p.name || "",
            value: p.value_name || p.value || "",
          }))
        : [];

    // 📍 Локация
    const location = item.location || {};
    const metros = Array.isArray(location.metros)
      ? location.metros.map((m: any) => ({
          name: getText(m.name),
          distance: getNumber(m.distance) || 0,
        }))
      : [];

    const characteristics: Record<string, any> = {};
    for (const key in item) {
      if (
        key.includes("area") ||
        key.includes("floor") ||
        key.includes("room")
      ) {
        characteristics[key] = getNumber(item[key]);
      }
    }
    characteristics.extra = extra;

    const phones =
      item.user?.properties?.find(
        (p: any) => p.name === "Робочий номер тел. (сайт)"
      )?.value || "";
    const county = location?.county;
    const isOutOfCity = !county;

    return {
      id: item.id?.toString() || "",
      status: item.status || "active",
      title: getText(item.title),
      description: getText(item.description),
      deal: getText(item.deal?.name),
      type: getText(item.realty_type?.name),
      is_new_building: item.is_new_building
        ? parseInt(item.is_new_building)
        : null,
      isOutOfCity, // <- поле как в XML-версии
      article: getText(item.article),
      category: getText(item.category?.name),
      newbuilding_name: getText(item.newbuilding_name),
      location: {
        country: getText(location.country?.name),
        region: getText(location.region?.name),
        city: getText(location.city?.name),
        borough: getText(location.borough?.name),
        district: getText(location.district?.name),
        street: getText(location.street?.name),
        county: county ? getText(county.name) : undefined,
        street_type: getText(location.street_type),
        lat: getNumber(location.map_lat) || undefined,
        lng: getNumber(location.map_lng) || undefined,
        metros,
      },
      characteristics,
      price: {
        value: getNumber(item.price?.value) || 0,
        currency: item.price?.currency || "USD",
      },
      images,
      contact: {
        name: getText(item.user?.name),
        phone: phones,
        email: getText(item.user?.email),
      },
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }
}
