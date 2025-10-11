import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Получаем все объекты с их контактами
  const items = await prisma.item.findMany({
    include: { contacts: true },
  });

  // Фильтруем только те, где больше одного контакта
  const itemsWithManyContacts = items.filter(
    (item) => item.contacts.length > 1
  );

  // Выводим информацию
  for (const item of itemsWithManyContacts) {
    console.log(`\n🟩 Item ID: ${item.id}, ${item.crmId} `);
    console.log(`📞 Кол-во контактов: ${item.contacts.length}`);

    item.contacts.forEach((contact) => {
      console.log(`  - Contact ID: ${contact.id}`);
      console.log(`    Name: ${contact.name}`);
      console.log(`    Phone: ${contact.phone}`);
      console.log(`    Email: ${contact.email}`);
    });
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
