import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDuplicatePrices() {
  try {
    console.log("Поиск дубликатов по itemId...");

    // Находим дубликаты itemId
    const duplicates = await prisma.$queryRaw<
      { itemid: number; count: bigint }[]
    >`
      SELECT "itemId", COUNT(*) as count
      FROM "Price"
      GROUP BY "itemId"
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
      console.log("Дубликатов не найдено.");
      return;
    }

    console.log(`Найдено дубликатов: ${duplicates.length}`);

    for (const dup of duplicates) {
      const itemId = dup.itemid;

      // Оставляем Price с минимальным id, остальные удаляем
      const prices = await prisma.price.findMany({
        where: { itemId },
        orderBy: { id: "asc" },
        select: { id: true },
      });

      // Первый оставляем, остальные удаляем
      const idsToDelete = prices.slice(1).map((p) => p.id);

      if (idsToDelete.length > 0) {
        await prisma.price.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        console.log(
          `Удалено ${idsToDelete.length} дубликатов для itemId=${itemId}`
        );
      }
    }

    console.log("Очистка дубликатов завершена.");
  } catch (err) {
    console.error("Ошибка при очистке дубликатов:", err);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск
cleanDuplicatePrices();
