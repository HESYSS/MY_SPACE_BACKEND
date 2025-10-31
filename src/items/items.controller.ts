// src/items/items.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  UseGuards,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ItemsService } from "./items.service";
import { Item } from "@prisma/client";
import { Request } from "express";

interface CustomRequest extends Request {
  user: {
    id: number;
    username: string;
    role: string;
  };
}

@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // GET /items?status=active&type=flat&city=Kyiv
  @Get()
  async findAll(@Query() query: any) {
    console.log("Query parameters:", query);
    return this.itemsService.findAll(query);
  }

  @Get("coords")
  async getCoordinates(@Query() query: any) {
    console.log("Получение координат с параметрами:", query);
    // query может содержать фильтры: deal, type, city и т.д.
    return this.itemsService.getCoordinates(query);
  }

  @Get("location")
  async getLocation(
    @Headers("accept-language") lang: string,
    @Query("category") category?: string,
    @Query("deal") deal?: string,
    @Query("type") type?: string
  ) {
    console.log("Получение локации:", { lang, category, deal, type });

    const data = await this.itemsService.getLocation({
      lang,
      category,
      deal,
      type,
    });

    return data;
  }

  /**
   * Получает все объекты недвижимости для админ-панели.
   * Требует аутентификации и роли 'admin' или 'superadmin'.
   * @returns Массив объектов недвижимости.
   */
  @Get("admin")
  @UseGuards(AuthGuard("jwt"))
  async getAllItemsForAdmin(@Req() req: CustomRequest): Promise<any[]> {
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      throw new ForbiddenException(
        "У вас нет прав для доступа к этому ресурсу."
      );
    }
    return this.itemsService.getAllItemsForAdmin();
  }

  // GET /items/:id
  @Get(":id")
  async findOne(@Param("id") id: string, @Query("lang") lang: string) {
    return this.itemsService.findOne(id, lang);
  }
}
