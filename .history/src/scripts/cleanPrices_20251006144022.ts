import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    include: { contacts: true },
  });

  const filtered = items.filter((item) => item.contacts.length > 1);

  filtered.forEach((item) => {
    console.log(`Item ID: ${item.id} → Contacts: ${item.contacts.length}`);
  });

  await prisma.$disconnect();
}

main();
