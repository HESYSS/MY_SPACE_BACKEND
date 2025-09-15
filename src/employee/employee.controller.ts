// src/employee/employee.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
  ForbiddenException,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeService } from './employee.service';
import { Employee } from '@prisma/client';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateEmployeeDto } from './dto/CreateEmployee.dto'; // <-- ИМПОРТИРУЕМ ПРАВИЛЬНЫЙ КЛАСС DTO

interface CustomRequest extends Request {
  user: {
    id: number;
    username: string;
    role: string;
  };
}

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async createEmployee(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Req() req: CustomRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для выполнения этого действия');
    }

    // Проверка наличия файла
    if (!file) {
      throw new BadRequestException('Employee photo file is required.');
    }

    // Передаем DTO и файл в сервис
    return this.employeeService.createEmployee(createEmployeeDto, file);
  }

  @Get()
  async findAllEmployees(): Promise<Employee[]> {
    return this.employeeService.findAllEmployees();
  }

  @Get(':id')
  async findEmployeeById(@Param('id', ParseIntPipe) id: number): Promise<Employee> {
    const employee = await this.employeeService.findEmployeeById(id);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteEmployee(@Param('id', ParseIntPipe) id: number, @Req() req: CustomRequest) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для выполнения этого действия');
    }
    return this.employeeService.deleteEmployee(id);
  }
}