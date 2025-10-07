// src/image/dto/image.dto.ts
import { IsBoolean, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateImageActiveStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class ImageOrderUpdateDto {
  @IsInt()
  id!: number;

  @IsInt()
  order!: number;
}

export class UpdateImageOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageOrderUpdateDto)
  updates!: ImageOrderUpdateDto[];
}