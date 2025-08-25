// src/items/items.controller.ts
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ItemsService } from "./items.service";

@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // GET /items?status=active&type=flat&city=Kyiv
  @Get()
  async findAll(@Query() query: any) {
    console.log("Received query:", query);
    return this.itemsService.findAll(query);
  }

  // GET /items/:id
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.itemsService.findOne(id);
  }
}
