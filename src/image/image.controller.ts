import { Express } from 'express';
import { Controller, Post, Get, Param, Body, UseInterceptors, UploadedFile, BadRequestException, Delete, ParseIntPipe, Patch } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from './image.service';

@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    return this.imageService.uploadImage(file);
  }

  @Get(':name')
  async getImage(@Param('name') name: string) {
    const image = await this.imageService.getImageByName(name);
    if (!image) {
      throw new BadRequestException('Image not found.');
    }
    return image;
  }

  @Get()
  async getAllImages() {
    return this.imageService.getAllImages();
  }

  @Delete(':id')
  async deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.imageService.deleteImage(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  async updateImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided for update.');
    }
    return this.imageService.updateImage(id, file);
  }
}
