// src/employee/dto/create-employee.dto.ts

import { IsOptional, IsString, IsBoolean, IsNumber } from "class-validator";
import { Transform } from "class-transformer";

export class CreateEmployeeDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  position!: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  experienceYears?: number;

  @IsString()
  @IsOptional()
  profile?: string;

  @IsString()
  @IsOptional()
  aboutMe?: string;

  @IsString()
  @IsOptional()
  firstNameEn?: string;

  @IsString()
  @IsOptional()
  lastNameEn?: string;

  @IsString()
  @IsOptional()
  positionEn?: string;

  @IsString()
  @IsOptional()
  profileEn?: string;

  @IsString()
  @IsOptional()
  aboutMeEn?: string;

  // Теперь это булевы значения, преобразованные из строк
  @IsBoolean()
  @Transform(({ value }) => value === "true")
  isPARTNER!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === "true")
  isMANAGER!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === "true")
  isACTIVE!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === "true")
  isSUPERVISOR!: boolean;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}
