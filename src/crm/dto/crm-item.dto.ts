// src/crm/dto/crm-item.dto.ts
export interface CrmItemDto {
  id: string;
  status: string;
  title: string;
  description: string;
  deal: string;
  type: string;

  // 👉 новые поля
  is_new_building?: number | null;
  isOutOfCity?: boolean; // <- новое поле
  article?: string;
  category?: string;
  newbuilding_name?: string;

  location: {
    country: string;
    region: string;
    city: string;
    borough?: string;
    county?: string; // 👈 новое поле
    district?: string;
    street?: string;
    street_type?: string; // 👈 новое поле
    lat?: number;
    lng?: number;
    metros?: { name: string; distance: number }[];
  };

  characteristics: {
    floor?: number;
    totalFloors?: number;
    rooms?: number;
    areaTotal?: number;
    areaKitchen?: number;

    // extra теперь массив объектов
    extra?: {
      label: string;
      value: string;
    }[];

    // и плюс динамические характеристики (area_living, area_land и т.п.)
    [key: string]: any;
  };

  price: {
    value: number;
    currency: string;
  };

  images: string[];

  contact: {
    name: string;
    phone: string;
    email: string;
  };

  createdAt: string;
  updatedAt: string;
}
