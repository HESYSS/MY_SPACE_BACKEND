import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const types = await prisma.characteristic.findMany({
    select: { key: true },
    distinct: ["key"],
    where: { key: { not: null } },
  });

  console.log("Уникальные type:");
  types.forEach((t) => console.log(t.key));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
