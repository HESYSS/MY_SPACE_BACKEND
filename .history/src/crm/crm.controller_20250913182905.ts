import { Controller, Get } from "@nestjs/common";
import { CrmService } from "./crm.service";

@Controller("crm")
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get("feed")
  async getFeed() {
    console.log("Received request for /crm/feed");
<<<<<<< HEAD

=======
>>>>>>> a9d30ddb6f2d2867fd8359be4390f7f9f3e3e10a
    const data = await this.crmService.syncData();
    console.log("end");
    return data;
  }
}
