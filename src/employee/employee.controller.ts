// employee.controller.ts
import { Controller, Post, Body, Get, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { Employee } from '@prisma/client';

// Добавьте этот DTO, он будет использоваться и в контроллере, и в сервисе
// Лучше вынести его в отдельный файл, например, src/dto/create-employee.dto.ts
export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  position: string;
  experienceYears?: number;
  profile?: string;
  aboutMe?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  positionEn?: string;
  profileEn?: string;
  aboutMeEn?: string;
}

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('create')
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(createEmployeeDto);
  }

  @Get()
  async findAllEmployees(): Promise<Employee[]> {
    return this.employeeService.findAllEmployees();
  }

  @Delete(':id')
  async deleteEmployee(@Param('id', ParseIntPipe) id: number): Promise<Employee> {
    return this.employeeService.deleteEmployee(id);
  }
}