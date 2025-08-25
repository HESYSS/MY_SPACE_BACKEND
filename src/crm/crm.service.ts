// src/crm/crm.service.ts
import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as xml2js from "xml2js";
import { CrmItemDto } from "./dto/crm-item.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CrmService {
  private crmUrl =
    "https://crm-myspace.realtsoft.net/feed/xml?id=3&updates=all";

  constructor(private prisma: PrismaService) {}

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
                    },
                    create: {
                      value: dto.price.value,
                      currency: dto.price.currency,
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
