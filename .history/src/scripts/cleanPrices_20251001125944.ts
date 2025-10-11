// scripts/fill-en-fields.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.item.updateMany({
    data: {
      newbuildingNameEn: prisma.item.fields.newbuildingName, // 👈 копируем из newbuildingName
      typeEn: prisma.item.fields.type, // 👈 копируем из type
    },
  });

  console.log(`Обновлено записей: ${result.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
