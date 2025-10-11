// scripts/fill-en-fields.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Дублируем поля для всех записей
  const res = await prisma.$executeRawUnsafe(`
    UPDATE "Item"
    SET "newbuildingNameEn" = "newbuildingName",
        "typeEn" = "type";
  `);

  console.log(`Обновлено строк: ${res}`);
}

main()
  .catch((e) => {
    console.error("Ошибка:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
