import { IsOptional, IsString, IsBoolean, IsInt } from "class-validator";
import { Type, Transform } from "class-transformer"; // <--- 💡 Добавлены импорты для трансформации

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  position?: string;

  // 1. ТРАНСФОРМАЦИЯ ДЛЯ ЧИСЛА
  @IsOptional()
  @Type(() => Number) // Преобразует строку в числовой тип данных
  @IsInt() // Валидирует, что это целое число
  experienceYears?: number;

  @IsOptional()
  @IsString()
  profile?: string;

  @IsOptional()
  @IsString()
  aboutMe?: string;

  @IsOptional()
  @IsString()
  firstNameEn?: string;

  @IsOptional()
  @IsString()
  lastNameEn?: string;

  @IsOptional()
  @IsString()
  positionEn?: string;

  @IsOptional()
  @IsString()
  profileEn?: string;

  @IsOptional()
  @IsString()
  aboutMeEn?: string;

  // 2. ТРАНСФОРМАЦИЯ ДЛЯ БУЛЕВЫХ ЗНАЧЕНИЙ
  @IsOptional()
  @Transform(({ value }) => value === "true") // Преобразует строку 'true' в boolean true
  @IsBoolean() // Валидирует, что это булево значение
  isPARTNER?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true") // Преобразует строку 'true' в boolean true
  @IsBoolean()
  isMANAGER?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true") // Преобразует строку 'true' в boolean true
  @IsBoolean()
  isSUPERVISOR?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true") // Преобразует строку 'true' в boolean true
  @IsBoolean()
  isACTIVE?: boolean;
}
