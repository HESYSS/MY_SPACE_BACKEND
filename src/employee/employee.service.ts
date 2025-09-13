// employee.service.ts
import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Employee } from '@prisma/client';
import { CreateEmployeeDto } from './dto/CreateEmployee.dto';
// Добавляем DeleteObjectCommand для удаления файлов
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'; 
import { randomUUID } from 'crypto';

@Injectable()
export class EmployeeService {
  private readonly r2Client: S3Client;
  private readonly R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  private readonly R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

  constructor(private prisma: PrismaService) {
    // Инициализация S3 клиента для взаимодействия с Cloudflare R2
    // Переменные для доступа загружаются из окружения (.env файл)
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
      throw new InternalServerErrorException('Missing R2 environment variables. Please check your .env file.');
    }
    
    this.r2Client = new S3Client({
      region: 'auto', // Автоматическое определение региона
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  // Метод создания работника теперь принимает файл с фотографией
  async createEmployee(data: CreateEmployeeDto, file: Express.Multer.File): Promise<Employee> {
    // Валидация: работник не может быть одновременно партнером и менеджером
    if (data.isPARTNER && data.isMANAGER) {
      throw new BadRequestException('An employee cannot be both a partner and a manager simultaneously.');
    }

    // Проверка ограничений на количество сотрудников
    const partnerCount = await this.prisma.employee.count({ where: { isPARTNER: true } });
    const managerCount = await this.prisma.employee.count({ where: { isMANAGER: true } });
    const activeCount = await this.prisma.employee.count({ where: { isACTIVE: true } });

    if (data.isPARTNER && partnerCount >= 4) {
      throw new BadRequestException('Cannot add more than 4 partners.');
    }
    if (data.isMANAGER && managerCount >= 4) {
      throw new BadRequestException('Cannot add more than 4 managers.');
    }
    if (data.isACTIVE && activeCount >= 8) {
      throw new BadRequestException('Cannot add more than 8 active employees.');
    }

    let photoUrl: string | null = null;
    if (file) {
      // Генерация уникального имени для файла, чтобы избежать конфликтов
      const fileName = `${randomUUID()}-${file.originalname}`;
      
      const uploadCommand = new PutObjectCommand({
        Bucket: this.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      try {
        await this.r2Client.send(uploadCommand);
        // Формирование публичного URL-адреса для доступа к загруженному файлу
        photoUrl = `${this.R2_PUBLIC_URL}/${fileName}`;
      } catch (error) {
        console.error('Ошибка загрузки файла в R2:', error);
        throw new InternalServerErrorException('Failed to upload employee photo.');
      }
    }

    return this.prisma.employee.create({
      data: {
        ...data,
        photoUrl,
      },
    });
  }

  async findAllEmployees(): Promise<Employee[]> {
    return this.prisma.employee.findMany();
  }

  async findEmployeeById(id: number): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found.`);
    }

    return employee;
  }

  // ОБНОВЛЁННЫЙ МЕТОД: удаляет и сотрудника, и его фото
  async deleteEmployee(id: number): Promise<Employee> {
    // 1. Сначала находим сотрудника по ID, чтобы получить URL его фотографии
    const employeeToDelete = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employeeToDelete) {
      throw new NotFoundException(`Employee with ID ${id} not found.`);
    }

    // 2. Если у сотрудника есть URL фотографии, пытаемся удалить файл
    const photoUrl = employeeToDelete.photoUrl;
    if (photoUrl) {
      // Извлекаем имя файла из URL-адреса
      const fileName = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);

      try {
        // Создаём команду для удаления файла из бакета
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.R2_BUCKET_NAME,
          Key: fileName,
        });
        
        // Отправляем команду R2 клиенту
        await this.r2Client.send(deleteCommand);
        console.log(`Файл ${fileName} успешно удален из бакета.`);
      } catch (error) {
        // Если удаление файла не удалось (например, файл не найден), 
        // логируем ошибку, но продолжаем удалять запись из базы данных,
        // чтобы не прерывать основной процесс.
        console.error(`Ошибка при удалении файла ${fileName} из бакета:`, error);
      }
    }

    // 3. Удаляем запись о сотруднике из базы данных
    return this.prisma.employee.delete({
      where: { id },
    });
  }
}