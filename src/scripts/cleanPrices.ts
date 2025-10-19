import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllImages() {
  try {
    const deleted = await prisma.image.deleteMany({});
    console.log(`Удалено ${deleted.count} изображений.`);
  } catch (error) {
    console.error('Ошибка при удалении изображений:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllImages();
