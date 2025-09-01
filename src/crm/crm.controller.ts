import { Controller, Get } from "@nestjs/common";
import { CrmService } from "./crm.service";

@Controller("crm")
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get("feed")
  async getFeed() {
    console.log("Received request for /crm/feed");
<<<<<<< HEAD
    //const data = await this.crmService.syncData();
    //return data;
=======
    const data = await this.crmService.syncData();
    return data;
>>>>>>> origin/master
  }
}
