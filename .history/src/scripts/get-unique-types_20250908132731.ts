import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const types = await prisma.item.findMany({
    select: { type: true },
    distinct: ["type"],
    where: { type: { not: null } },
  });

  console.log("Уникальные type:");
  types.forEach((t) => console.log(t.type));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
