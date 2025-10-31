// employee.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Employee } from "@prisma/client";
import { CreateEmployeeDto } from "./dto/CreateEmployee.dto";
// Добавляем DeleteObjectCommand для удаления файлов
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";
import * as fs from "fs";

@Injectable()
export class EmployeeService {
  private readonly r2Client: S3Client;
  private readonly R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  private readonly R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

  constructor(private prisma: PrismaService) {
    // Инициализация S3 клиента для взаимодействия с Cloudflare R2
    // Переменные для доступа загружаются из окружения (.env файл)
    if (
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_ENDPOINT
    ) {
      throw new InternalServerErrorException(
        "Missing R2 environment variables. Please check your .env file."
      );
    }

    this.r2Client = new S3Client({
      region: "auto", // Автоматическое определение региона
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  } // Метод создания работника теперь принимает файл с фотографией

  async createEmployee(
    data: CreateEmployeeDto, // 💡 ИЗМЕНЕНИЕ: делаем file необязательным параметром
    file?: Express.Multer.File
  ): Promise<Employee> {
    // Валидация: работник не может быть одновременно партнером и менеджером
    if (data.isPARTNER && data.isMANAGER && data.isSUPERVISOR) {
      throw new BadRequestException(
        "An employee cannot be both a partner and a manager simultaneously."
      );
    } // Проверка ограничений на количество сотрудников

    const partnerCount = await this.prisma.employee.count({
      where: { isPARTNER: true },
    });
    const managerCount = await this.prisma.employee.count({
      where: { isSUPERVISOR: true },
    });
    const activeCount = await this.prisma.employee.count({
      where: { isACTIVE: true },
    });

    if (data.isPARTNER && partnerCount >= 6) {
      throw new BadRequestException("Cannot add more than 6 partners.");
    }
    if (data.isSUPERVISOR && managerCount >= 6) {
      throw new BadRequestException("Cannot add more than 6 supervisors.");
    }
    if (data.isACTIVE && activeCount >= 8) {
      throw new BadRequestException("Cannot add more than 8 active employees.");
    }

    let photoUrl: string;

    if (file) {
      // Если пользователь загрузил фото
      const fileName = `${randomUUID()}-${file.originalname}`;

      const uploadCommand = new PutObjectCommand({
        Bucket: this.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      try {
        await this.r2Client.send(uploadCommand);
        photoUrl = `${this.R2_PUBLIC_URL}/${fileName}`;
      } catch (error) {
        console.error("Ошибка загрузки файла в R2:", error);
        throw new InternalServerErrorException(
          "Failed to upload employee photo."
        );
      }
    } else {
      // Если файла нет — используем локальный дефолт и загружаем в R2
      const defaultFilePath = path.join(
        __dirname,
        "../assets/default-avatar.png"
      );
      const defaultBuffer = fs.readFileSync(defaultFilePath);
      const fileName = `${randomUUID()}-default-avatar.png`;

      const uploadCommand = new PutObjectCommand({
        Bucket: this.R2_BUCKET_NAME,
        Key: fileName,
        Body: defaultBuffer,
        ContentType: "image/png",
      });

      try {
        await this.r2Client.send(uploadCommand);
        photoUrl = `${this.R2_PUBLIC_URL}/${fileName}`;
      } catch (error) {
        console.error("Ошибка загрузки дефолтного файла в R2:", error);
        throw new InternalServerErrorException(
          "Failed to upload default employee photo."
        );
      }
    }

    return this.prisma.employee.create({
      data: {
        ...data,
        photoUrl, // photoUrl будет null, если файл не был предоставлен
      },
    });
  }

  async updateEmployee(
    id: number,
    data: any,
    file?: Express.Multer.File
  ): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found.`);
    }

    let photoUrl = employee.photoUrl;

    // Если пришёл новый файл — заменяем старый
    if (file) {
      // Удаляем старый файл
      if (employee.photoUrl) {
        const oldFileName = employee.photoUrl.substring(
          employee.photoUrl.lastIndexOf("/") + 1
        );
        try {
          await this.r2Client.send(
            new DeleteObjectCommand({
              Bucket: this.R2_BUCKET_NAME,
              Key: oldFileName,
            })
          );
        } catch (err) {
          console.error("Ошибка удаления старого файла:", err);
        }
      }

      // Загружаем новый файл
      const newFileName = `${randomUUID()}-${file.originalname}`;
      try {
        await this.r2Client.send(
          new PutObjectCommand({
            Bucket: this.R2_BUCKET_NAME,
            Key: newFileName,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );
        photoUrl = `${this.R2_PUBLIC_URL}/${newFileName}`;
      } catch (error) {
        console.error("Ошибка загрузки нового файла:", error);
        throw new InternalServerErrorException(
          "Failed to upload new employee photo."
        );
      }
    }

    // Обновляем данные сотрудника
    return this.prisma.employee.update({
      where: { id },
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
  } // ОБНОВЛЁННЫЙ МЕТОД: удаляет и сотрудника, и его фото

  async deleteEmployee(id: number): Promise<Employee> {
    // 1. Сначала находим сотрудника по ID, чтобы получить URL его фотографии
    const employeeToDelete = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employeeToDelete) {
      throw new NotFoundException(`Employee with ID ${id} not found.`);
    } // 2. Если у сотрудника есть URL фотографии, пытаемся удалить файл

    const photoUrl = employeeToDelete.photoUrl;
    if (photoUrl) {
      // Извлекаем имя файла из URL-адреса
      const fileName = photoUrl.substring(photoUrl.lastIndexOf("/") + 1);

      try {
        // Создаём команду для удаления файла из бакета
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.R2_BUCKET_NAME,
          Key: fileName,
        }); // Отправляем команду R2 клиенту

        await this.r2Client.send(deleteCommand);
        console.log(`Файл ${fileName} успешно удален из бакета.`);
      } catch (error) {
        // Если удаление файла не удалось (например, файл не найден),
        // логируем ошибку, но продолжаем удалять запись из базы данных,
        // чтобы не прерывать основной процесс.
        console.error(
          `Ошибка при удалении файла ${fileName} из бакета:`,
          error
        );
      }
    } // 3. Удаляем запись о сотруднике из базы данных

    return this.prisma.employee.delete({
      where: { id },
    });
  }
}
