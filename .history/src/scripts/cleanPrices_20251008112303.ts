import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.contact.deleteMany({});
  console.log(`✅ Удалено контактов: ${count.count}`);
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при удалении:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
