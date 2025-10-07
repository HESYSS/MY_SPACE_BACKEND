import {
  Express
} from 'express';
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Delete,
  ParseIntPipe,
  Patch,
  UseGuards,
  ForbiddenException,
  Req,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  FileInterceptor
} from '@nestjs/platform-express';
import {
  AuthGuard
} from '@nestjs/passport';
import {
  ImageService
} from './image.service';
import {
  Request
} from 'express';
import {
  Image
} from '@prisma/client';
import {
  UpdateImageActiveStatusDto,
  UpdateImageOrderDto
} from './dto/image.dto';

interface CustomRequest extends Request {
  user: {
    id: number;
    username: string;
    role: string;
  };
}

@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: CustomRequest) {
    // Проверяем, имеет ли пользователь нужную роль
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для загрузки изображений.');
    }
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
  @UseGuards(AuthGuard('jwt'))
  async deleteImage(@Param('id', ParseIntPipe) id: number, @Req() req: CustomRequest) {
    // Проверяем, имеет ли пользователь нужную роль
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для удаления изображений.');
    }
    return this.imageService.deleteImage(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async updateImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: CustomRequest,
  ) {
    // Проверяем, имеет ли пользователь нужную роль
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для обновления изображений.');
    }
    if (!file) {
      throw new BadRequestException('No file provided for update.');
    }
    return this.imageService.updateImage(id, file);
  }

  // --- НОВЫЕ ЭНДПОИНТЫ ДЛЯ ИЗОБРАЖЕНИЙ ОБЪЕКТОВ НЕДВИЖИМОСТИ ---

  /**
   * Получает все изображения для конкретного объекта недвижимости по его ID.
   * Роут: GET /images/item/:itemId
   */
  @Get('item/:itemId')
  async getItemImages(@Param('itemId', ParseIntPipe) itemId: number): Promise < Image[] > {
    return this.imageService.getImagesByItemId(itemId);
  }

  /**
   * Обновляет статус активности (isActive) для одного изображения объекта.
   * Роут: PUT /images/item/:imageId/active
   */
  @Put('item/:imageId/active')
  @UseGuards(AuthGuard('jwt'))
  async updateItemImageActiveStatus(
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() updateDto: UpdateImageActiveStatusDto,
    @Req() req: CustomRequest,
  ): Promise < Image > {
    // Проверяем, имеет ли пользователь нужную роль
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для изменения статуса изображения.');
    }
    return this.imageService.updateItemImageActiveStatus(
      imageId,
      updateDto.isActive,
    );
  }

  /**
   * Обновляет порядок (order) для нескольких изображений объекта.
   * Роут: PUT /images/item/order
   */
  @Put('item/order')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async updateItemImageOrder(
    @Body() updateDto: UpdateImageOrderDto,
    @Req() req: CustomRequest,
  ): Promise < Image[] > {
    // Проверяем, имеет ли пользователь нужную роль
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для изменения порядка изображений.');
    }
    return this.imageService.updateItemImageOrder(updateDto.updates);
  }
}