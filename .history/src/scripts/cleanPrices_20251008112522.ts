import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();

async function askUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function main() {
  console.log(
    "⚠️  ВНИМАНИЕ: этот скрипт удалит ВСЕ контакты из таблицы Contact."
  );
  const answer = await askUser("Ты уверен? (y/n): ");

  if (answer.toLowerCase() !== "y") {
    console.log("❎ Отменено пользователем.");
    process.exit(0);
  }

  const beforeCount = await prisma.contact.count();
  console.log(`📊 Найдено контактов: ${beforeCount}`);

  const result = await prisma.contact.deleteMany({});
  console.log(`✅ Удалено контактов: ${result.count}`);

  const afterCount = await prisma.contact.count();
  console.log(`📉 Осталось контактов: ${afterCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при удалении:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
