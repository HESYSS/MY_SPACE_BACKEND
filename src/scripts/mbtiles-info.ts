//@ts-ignore
import MBTiles from "@mapbox/mbtiles";
import path from "path";

const mbtilesPath = path.join(__dirname, "../data/tiles.mbtiles");

new MBTiles(mbtilesPath, (err: Error | null, mbtiles: MBTiles) => {
  if (err) {
    console.error("Error loading MBTiles:", err);
    process.exit(1);
  }

  mbtiles.getInfo((err: Error | null, info: any) => {
    if (err) {
      console.error("Error getting info:", err);
      process.exit(1);
    }
    console.log("MBTiles info:", info);
  });
});
