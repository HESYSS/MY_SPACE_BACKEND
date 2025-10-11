// src/scripts/generate-slugs.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Транслитерация
const transliterate = (text: string): string => {
  const map: { [key: string]: string } = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    А: "A",
    Б: "B",
    В: "V",
    Г: "G",
    Д: "D",
    Е: "E",
    Ё: "E",
    Ж: "Zh",
    З: "Z",
    И: "I",
    Й: "Y",
    К: "K",
    Л: "L",
    М: "M",
    Н: "N",
    О: "O",
    П: "P",
    Р: "R",
    С: "S",
    Т: "T",
    У: "U",
    Ф: "F",
    Х: "Kh",
    Ц: "Ts",
    Ч: "Ch",
    Ш: "Sh",
    Щ: "Shch",
    Ъ: "",
    Ы: "Y",
    Ь: "",
    Э: "E",
    Ю: "Yu",
    Я: "Ya",
    і: "i",
    ї: "yi",
    є: "ye",
    ґ: "g",
    І: "I",
    Ї: "Yi",
    Є: "Ye",
    Ґ: "G",
  };
  return text
    .split("")
    .map((char) => map[char] || char)
    .join("");
};

// Создание slug
const createSlug = (text: string): string => {
  if (!text) return "";
  const transliteratedText = transliterate(text);
  return transliteratedText
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
};

async function main() {
  console.log("Начало генерации slugs для всех объектов недвижимости...");

  const items = await prisma.item.findMany({
    select: {
      id: true,
      title: true,
    },
  });

  if (items.length === 0) {
    console.log("Объектов не найдено. Скрипт завершен.");
    return;
  }

  const updatePromises = items.map((item) => {
    const baseSlug = createSlug(item.title || "");
    const generatedSlug = `${item.id}-${baseSlug}`;

    return prisma.item.update({
      where: { id: item.id },
      data: { slug: generatedSlug },
    });
  });

  await prisma.$transaction(updatePromises);

  console.log(`Успешно сгенерировано и заменено ${items.length} slug'ов.`);
}

main()
  .catch((e) => {
    console.error("Ошибка при генерации slugs:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
