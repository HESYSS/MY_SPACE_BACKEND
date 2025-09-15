// src/image/image.module.ts
import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ImageController],
  providers: [ImageService, PrismaService],
})
export class ImageModule {}