import {
  Controller,
  Get,
  Query,
  Res,
  HttpException,
  OnModuleInit,
  Param,
} from "@nestjs/common";
import { Response } from "express";
import path from "path";
import { Worker } from "worker_threads";

@Controller("tiles")
export class TilesController implements OnModuleInit {
  private worker!: Worker;
  private ready = false;
  private bounds: [number, number, number, number] = [29, 50, 32, 51.5];

  async onModuleInit() {
    const mbtilesPath = path.join(__dirname, "../data/tiles.mbtiles");

    this.worker = new Worker(path.join(__dirname, "tile-worker.js"), {
      workerData: { path: mbtilesPath },
    });

    this.worker.on("message", (msg) => {
      if (msg.ready) {
        console.log("Tile worker ready");
        this.ready = true;
      }
    });

    this.worker.on("error", (err) => console.error("Worker error:", err));
  }

  private lonLatToTile(lon: number, lat: number, z: number) {
    const n = 2 ** z;
    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        n
    );
    return { x, y };
  }

  private getTile(z: number, x: number, y: number): Promise<Buffer | null> {
    if (!this.ready) throw new HttpException("Tile worker not ready", 500);

    return new Promise((resolve, reject) => {
      const listener = (msg: any) => {
        if (msg.z === z && msg.x === x && msg.y === y) {
          this.worker.off("message", listener);
          if (msg.error) return reject(new Error(msg.error));
          // Снимаем base64, используем raw Buffer
          resolve(msg.tile ?? null);
        }
      };

      this.worker.on("message", listener);
      this.worker.postMessage({ z, x, y });
    });
  }

  @Get(":z/:x/:y.pbf")
  async getTileXYZ(
    @Param("z") zStr: string,
    @Param("x") xStr: string,
    @Param("y") yStr: string,
    @Res() res: Response
  ) {
    console.log(`Tile request: z=${zStr}, x=${xStr}, y=${yStr}`);
    const z = Number(zStr);
    const x = Number(xStr);
    const y = Number(yStr);

    const lon = (x / 2 ** z) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

    if (
      lon < this.bounds[0] ||
      lon > this.bounds[2] ||
      lat < this.bounds[1] ||
      lat > this.bounds[3]
    ) {
      return res.status(204).send();
    }

    try {
      const tile = await this.getTile(z, x, y);
      if (!tile) return res.status(204).send();

      res.setHeader("Content-Type", "application/vnd.mapbox-vector-tile");
      res.send(tile);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
}
