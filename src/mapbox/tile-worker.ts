import { parentPort, workerData } from "node:worker_threads";
// @ts-ignore
import MBTiles from "@mapbox/mbtiles";

const mbtilesPath = workerData.path as string;

new MBTiles(mbtilesPath + "?mode=ro", (err: Error | null, db: any) => {
  if (err) throw err;
  console.log("MBTiles loaded in worker");

  parentPort?.postMessage({ ready: true });

  parentPort?.on("message", ({ z, x, y }) => {
    db.getTile(z, x, y, (err: Error | null, data: Buffer) => {
      if (err) {
        parentPort?.postMessage({ z, x, y, error: err.message });
      } else if (!data) {
        parentPort?.postMessage({ z, x, y, tile: null });
      } else {
        // Передаём raw Buffer без Transferable
        parentPort?.postMessage({ z, x, y, tile: data });
      }
    });
  });
});
