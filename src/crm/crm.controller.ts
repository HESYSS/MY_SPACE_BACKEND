import { Controller, Get, Query } from "@nestjs/common";
import { CrmService } from "./crm.service";

@Controller("crm")
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get("sync")
  async sync(@Query("type") type: "day" | "all" = "day") {
    const url =
      type === "all"
        ? process.env.FULL_FEED_URL!"
        : process.env.DAILY_FEED_URL!;

    await this.crmService.syncData(url, type === "all");
    return { message: `✅ Sync complete: ${type}` };
  }
}
