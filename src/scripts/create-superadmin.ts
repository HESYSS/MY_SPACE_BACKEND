import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createSuperAdmin() {
  try {
    console.log('Пожалуйста, введите данные для создания первого супер-админа.');
    
    rl.question('Введите имя пользователя: ', async (username) => {
      rl.question('Введите пароль: ', async (password) => {
        if (!username || !password) {
          console.error('Имя пользователя и пароль не могут быть пустыми.');
          rl.close();
          return;
        }

        // Проверяем, существует ли уже пользователь с таким именем
        const existingAdmin = await prisma.admin.findUnique({
          where: { username },
        });

        if (existingAdmin) {
          console.error(`Ошибка: Администратор с именем "${username}" уже существует.`);
          rl.close();
          return;
        }

        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создаем нового суперадмина в БД
        const superAdmin = await prisma.admin.create({
          data: {
            username,
            password: hashedPassword,
            role: 'superadmin',
          },
        });

        console.log(`✅ Супер-админ "${superAdmin.username}" успешно создан!`);
        console.log(`Роль: ${superAdmin.role}`);

        rl.close();
      });
    });

  } catch (e) {
    console.error('Произошла ошибка при создании суперадмина:', e);
    rl.close();
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();