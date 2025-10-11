import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import { writeFileSync } from "fs";

const FEED_JSON_URL =
  "https://crm-myspace.realtsoft.net/feed/json?id=3&updates=all";
const FEED_XML_URL =
  "https://crm-myspace.realtsoft.net/feed/xml?id=3&updates=all";

// 🔹 Укажи нужный артикул здесь
const TARGET_ARTICLE = "9050";

// 🔹 Имя файла для сохранения
const OUTPUT_FILE = "./result.txt";

async function findInJsonFeed() {
  try {
    const res = await fetch(FEED_JSON_URL);
    if (!res.ok) throw new Error(`JSON feed HTTP error: ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error("Invalid JSON feed format");

    const found = data.find(
      (item: any) => String(item.article) === TARGET_ARTICLE
    );
    return found ? JSON.stringify(found, null, 2) : null;
  } catch (err) {
    console.error("❌ JSON feed error:", err);
    return null;
  }
}

async function findInXmlFeed() {
  try {
    const res = await fetch(FEED_XML_URL);
    if (!res.ok) throw new Error(`XML feed HTTP error: ${res.status}`);
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const items = parsed?.realty_feed?.item;
    if (!items) throw new Error("Invalid XML feed format");

    const list = Array.isArray(items) ? items : [items];
    const found = list.find(
      (item: any) => String(item.article) === TARGET_ARTICLE
    );
    return found ? JSON.stringify(found, null, 2) : null;
  } catch (err) {
    console.error("❌ XML feed error:", err);
    return null;
  }
}

async function main() {
  console.log(`🔍 Пошук об'єкта за артикулом ${TARGET_ARTICLE}...`);

  const jsonResult = await findInJsonFeed();
  const xmlResult = await findInXmlFeed();

  let output = `🔎 Результати пошуку для артикулу ${TARGET_ARTICLE}\n`;
  output += `==============================\n\n`;

  if (jsonResult) {
    output += `📘 JSON feed:\n${jsonResult}\n\n`;
  } else {
    output += `📘 JSON feed: ❌ не знайдено\n\n`;
  }

  if (xmlResult) {
    output += `📗 XML feed:\n${xmlResult}\n\n`;
  } else {
    output += `📗 XML feed: ❌ не знайдено\n\n`;
  }

  writeFileSync(OUTPUT_FILE, output, "utf-8");
  console.log(`✅ Результат збережено у файл: ${OUTPUT_FILE}`);
}

main();
