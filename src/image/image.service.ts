import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SiteImage } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private prisma: PrismaService) {
    const {
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_ENDPOINT,
      R2_BUCKET_NAME,
      R2_PUBLIC_URL,
    } = process.env;

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
      throw new InternalServerErrorException('Missing Cloudflare R2 environment variables.');
    }
    
    this.bucketName = R2_BUCKET_NAME;
    this.publicUrl = R2_PUBLIC_URL;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Загружает файл в Cloudflare R2 и создает запись в базе данных.
   * @param file - Загруженный файл (Express.Multer.File).
   * @returns Созданная запись SiteImage с URL.
   */
  async uploadImage(file: Express.Multer.File): Promise<SiteImage> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`; 

    const existingImage = await this.prisma.siteImage.findUnique({
      where: { name: file.originalname },
    });
    if (existingImage) {
      throw new BadRequestException('Image with this name already exists.');
    }

    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(uploadCommand);
    } catch (error) {
      console.error('Failed to upload image to R2:', error);
      throw new BadRequestException('Failed to upload image to storage.');
    }

    const publicUrl = `${this.publicUrl}/${fileName}`;

    return this.prisma.siteImage.create({
      data: {
        name: file.originalname,
        url: publicUrl,
      },
    });
  }

  /**
   * Возвращает URL изображения по его уникальному названию.
   * @param name - Имя изображения.
   * @returns Объект SiteImage или null, если не найден.
   */
  async getImageByName(name: string): Promise<SiteImage | null> {
    return this.prisma.siteImage.findUnique({
      where: { name },
    });
  }

  /**
   * Возвращает список всех загруженных изображений.
   * @returns Массив объектов SiteImage.
   */
  async getAllImages(): Promise<SiteImage[]> {
    return this.prisma.siteImage.findMany();
  }

  /**
   * Удаляет изображение из Cloudflare R2 и запись из базы данных.
   * @param id - ID изображения, которое нужно удалить.
   * @returns Удаленная запись SiteImage.
   */
  async deleteImage(id: number): Promise<SiteImage> {
    const image = await this.prisma.siteImage.findUnique({ where: { id } });
    if (!image) {
      throw new BadRequestException('Image not found.');
    }

    const key = image.url.split('/').pop();

    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(deleteCommand);
    } catch (error) {
      console.error('Failed to delete image from R2:', error);
      throw new BadRequestException('Failed to delete image from storage.');
    }
    
    return this.prisma.siteImage.delete({ where: { id } });
  }

/**
   * Обновляет существующее изображение, загружая новый файл и удаляя старый.
   * @param id - ID изображения для обновления.
   * @param file - Новый файл изображения.
   * @returns Обновленная запись SiteImage.
   */
  async updateImage(id: number, file: Express.Multer.File): Promise<SiteImage> {
    const oldImage = await this.prisma.siteImage.findUnique({ where: { id } });
    if (!oldImage) {
      throw new BadRequestException('Image not found.');
    }

    // 1. Удаляем старый файл из Cloudflare R2
    const oldFileKey = oldImage.url.split('/').pop();
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: oldFileKey,
    });

    try {
      await this.s3Client.send(deleteCommand);
    } catch (error) {
      console.warn('Failed to delete old image from R2:', error);
    }

    // 2. Загружаем новый файл с новым уникальным именем
    const fileExtension = file.originalname.split('.').pop();
    const newFileName = `${uuidv4()}.${fileExtension}`;
    const newPublicUrl = `${this.publicUrl}/${newFileName}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: newFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(uploadCommand);
    } catch (error) {
      console.error('Failed to upload new image to R2:', error);
      throw new BadRequestException('Failed to upload new image.');
    }

    // 3. Обновляем запись в базе данных, сохраняя старое название, но обновляя URL
    return this.prisma.siteImage.update({
      where: { id },
      data: {
        url: newPublicUrl, // Обновляем только URL, имя остается прежним
      },
    });
  }
}
