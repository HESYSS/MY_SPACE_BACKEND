import { Controller, Post, Body, Get, Delete, Param, ParseIntPipe, NotFoundException, UseGuards, UnauthorizedException, ForbiddenException, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeService } from './employee.service';
import { Employee } from '@prisma/client';
import { Request } from 'express'; // Импортируем Request из Express

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
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req: CustomRequest) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenException('У вас нет прав для выполнения этого действия');
    }
    return this.employeeService.createEmployee(createEmployeeDto);
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