// src/items/items.controller.ts
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ItemsService } from "./items.service";

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
    // query может содержать фильтры: deal, type, city и т.д.
    return this.itemsService.getCoordinates(query);
  }

  @Get("location")
  async getLocation(@Query() query: any) {
    console.log("Получение локации с фильтрами:", query);
    const data = await this.itemsService.getLocation();
    console.log(data);
    return data;
  }

  // GET /items/:id
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.itemsService.findOne(id);
  }
}
