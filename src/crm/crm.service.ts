// src/crm/crm.service.ts
import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as xml2js from "xml2js";
import { CrmItemDto } from "./dto/crm-item.dto";
import { PrismaService } from "../prisma/prisma.service";
import { TranslateService } from "../translate/translate.service";

@Injectable()
export class CrmService {
  private crmUrl =
    "https://crm-myspace.realtsoft.net/feed/xml?id=3&updates=all";

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

  private startAutoTranslate() {
    const interval = 5000; // проверяем каждые 5 секунд
    setInterval(async () => {
      if (this.dtoContainer.length === 0) return;
      console.log("Найдены новые DTO, запускаем перевод...");
      try {
        await this.translateAndSave();
      } catch (err) {
        console.error("Ошибка при автоматическом переводе:", err);
      }
    }, interval);
  }

  async translateAndSave(): Promise<void> {
    if (!this.dtoContainer.length) {
      console.log("Нет данных для перевода");
      return;
    }

    for (const dto of this.dtoContainer) {
      // Проверяем, есть ли что-то для перевода
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
      const [
        titleEn,
        descriptionEn,
        dealEn,
        typeEn,
        categoryEn,
        newbuildingNameEn,
      ] = await Promise.all([
        dto.title ? this.translateService.translateText(dto.title, "en") : "",
        dto.description
          ? this.translateService.translateText(dto.description, "en")
          : "",
        dto.deal ? this.translateService.translateText(dto.deal, "en") : "",
        dto.type ? this.translateService.translateText(dto.type, "en") : "",
        dto.category
          ? this.translateService.translateText(dto.category, "en")
          : "",
        dto.newbuilding_name
          ? this.translateService.translateText(dto.newbuilding_name, "en")
          : "",
      ]);

      // Перевод локации
      const locationEn: Partial<Record<string, string>> = {};
      if (dto.location) {
        const locFields: (keyof typeof dto.location)[] = [
          "country",
          "region",
          "city",
          "county",
          "borough",
          "district",
          "street",
          "street_type",
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

      // Метро с переводами
      const metrosWithTranslations = await Promise.all(
        (dto.location?.metros || []).map(async (m) => ({
          id: Number(dto.id),
          nameEn: m.name
            ? await this.translateService.translateText(m.name, "en")
            : "",
        }))
      );

      // Характеристики с переводами
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
          keyEn: c.key
            ? await this.translateService.translateText(c.key, "en")
            : "",
          valueEn: c.value
            ? await this.translateService.translateText(c.value, "en")
            : "",
        }))
      );

      // Сохраняем переводы в БД
      await this.prisma.item.update({
        where: { crmId: dto.id },
        data: {
          titleEn,
          descriptionEn,
          dealEn,
          typeEn,
          categoryEn,
          newbuildingNameEn,
          location: dto.location
            ? {
                update: locationEn,
              }
            : undefined,
          metros: {
            updateMany: metrosWithTranslations.map((m) => ({
              where: { id: m.id },
              data: { nameEn: m.nameEn },
            })),
          },
          characteristics: {
            updateMany: characteristicsWithTranslations.map((c) => ({
              where: { key: c.key, itemId: Number(dto.id) },
              data: { keyEn: c.keyEn, valueEn: c.valueEn },
            })),
          },
        },
      });
    }

    // Очищаем контейнер после перевода
    this.dtoContainer = [];
    console.log("Переводы сохранены");
  }

  async syncData(): Promise<void> {
    const response = await axios.get(this.crmUrl);
    const xml = response.data;

    const parsed = await xml2js.parseStringPromise(xml, {
      explicitArray: false,
      mergeAttrs: true,
    });

    const items = parsed.response.item
      ? Array.isArray(parsed.response.item)
        ? parsed.response.item
        : [parsed.response.item]
      : [];

    for (const raw of items) {
      const dto = this.mapXmlItemToDto(raw);
      this.dtoContainer.push(dto);
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

          prices: {
            upsert: dto.price
              ? [
                  {
                    where: { id: 0 }, // пока нет ID, можно оставить пустым или использовать create вместо upsert
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
                ]
              : [],
          },
          contacts: {
            upsert: dto.contact
              ? [
                  {
                    where: { id: 0 }, // аналогично, используем create если ID нет
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
                ]
              : [],
          },
          images: {
            upsert: dto.images.map((url, index) => ({
              where: { id: 0 }, // аналогично
              update: { url, order: index },
              create: { url, order: index },
            })),
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
        },
      });
    }
  }

  private mapXmlItemToDto(item: any): CrmItemDto {
    const getText = (field: any) => {
      if (!field) return "";
      if (typeof field === "string") return field.trim();
      if (typeof field === "object" && "_" in field) return field._.trim();
      if (typeof field === "object" && "value" in field)
        return field.value.trim();
      return "";
    };
    const getNumber = (field: any) => (field ? parseFloat(field) : undefined);

    const images = item.images?.image_url
      ? Array.isArray(item.images.image_url)
        ? item.images.image_url.map((i: any) => i?._ || i)
        : [item.images.image_url?._ || item.images.image_url]
      : [];

    const extra = item.properties?.property
      ? Array.isArray(item.properties.property)
        ? item.properties.property.map((p: any) => ({
            label: p.label || "",
            value: p._ || "",
          }))
        : [
            {
              label: item.properties.property.label || "",
              value: item.properties.property._ || "",
            },
          ]
      : [];
    const street = getText(item.location?.street);
    const streetType = getText(item.location?.street_type);
    const city = getText(item.location?.city);

    const isOutOfCity =
      !street ||
      !streetType ||
      city.toLowerCase().startsWith("с.") ||
      city.toLowerCase() !== "київ";

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

    const phones = item.user?.phones?.phone
      ? Array.isArray(item.user.phones.phone)
        ? item.user.phones.phone.map((p: any) => p?._ || p).join(", ")
        : item.user.phones.phone?._ || item.user.phones.phone
      : "";

    const metroArray = item.location?.metros?.metro
      ? Array.isArray(item.location.metros.metro)
        ? item.location.metros.metro
        : [item.location.metros.metro]
      : [];

    const county = item.location?.county;

    const metros = metroArray.map((m: any) => ({
      name: m._ || "",
      distance: parseInt(m.value || m.$?.value || "0", 10),
    }));

    return {
      id: item["internal-id"] || "",
      status: item.status,
      title: item.title,
      description: item.description,
      deal: getText(item.deal),
      type: getText(item.realty_type),
      is_new_building: item.is_new_building
        ? parseInt(item.is_new_building, 10)
        : null,
      isOutOfCity, // <- новое поле
      article: getText(item.article),
      category: getText(item.category),
      newbuilding_name: getText(item.newbuilding_name),
      location: {
        country: getText(item.location?.country),
        region: getText(item.location?.region),
        city,
        borough: getText(item.location?.borough),
        district: getText(item.location?.district),
        street,
        county: county ? getText(county) : null,
        street_type: streetType,
        lat: getNumber(item.location?.map_lat),
        lng: getNumber(item.location?.map_lng),
        metros: metroArray.map((m: any) => ({
          name: m._ || "",
          distance: parseInt(m.value || m.$?.value || "0", 10),
        })),
      },
      characteristics,
      price: {
        value: getNumber(item.price?._) || 0,
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
