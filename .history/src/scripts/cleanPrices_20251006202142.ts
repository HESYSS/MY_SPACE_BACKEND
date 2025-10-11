import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const FEED_URL = "https://crm-myspace.realtsoft.net/feed/json?id=3&updates=all";

// 🟩 Введи сюда артикул, который нужно найти
const TARGET_ARTICLE = "9051"; // например "A-1011"

async function main() {
  try {
    console.log("⏳ Загружаю фид...");
    const response = await fetch(FEED_URL);

    if (!response.ok) {
      throw new Error(
        `Ошибка загрузки: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Некорректный формат данных — ожидался массив объектов");
    }

    console.log(`✅ Загружено ${data.length} объектов`);

    // Ищем объект по артикулу
    const found = data.find((item: any) => item.article === TARGET_ARTICLE);

    if (!found) {
      console.log(`❌ Объект с артикулем ${TARGET_ARTICLE} не найден.`);
      return;
    }

    // Сохраняем в файл
    const filePath = path.join(process.cwd(), `object_${TARGET_ARTICLE}.json`);
    fs.writeFileSync(filePath, JSON.stringify(found, null, 2), "utf-8");

    console.log(`✅ Объект сохранен в файл: ${filePath}`);
  } catch (error) {
    console.error("🚨 Ошибка:", error);
  }
}

main();
