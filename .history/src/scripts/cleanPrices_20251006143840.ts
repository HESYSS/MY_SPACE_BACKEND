import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Берём все объекты с их контактами
  const items = await prisma.item.findMany({
    include: { contacts: true },
  });

  // Выводим id и количество контактов
  for (const item of items) {
    console.log(`Item ID: ${item.id} → Contacts: ${item.contacts.length}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
