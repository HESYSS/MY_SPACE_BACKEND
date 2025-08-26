// employee.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Employee } from '@prisma/client';
import { CreateEmployeeDto } from './dto/CreateEmployee.dto';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async createEmployee(data: CreateEmployeeDto): Promise<Employee> {
    // Валидация: работник не может быть одновременно партнером и менеджером
    if (data.isPARTNER && data.isMANAGER) {
      throw new BadRequestException('An employee cannot be both a partner and a manager simultaneously.');
    }

    // Проверка ограничений на количество сотрудников
    const partnerCount = await this.prisma.employee.count({ where: { isPARTNER: true } });
    const managerCount = await this.prisma.employee.count({ where: { isMANAGER: true } });
    const activeCount = await this.prisma.employee.count({ where: { isACTIVE: true } });

    if (data.isPARTNER && partnerCount >= 4) {
      throw new BadRequestException('Cannot add more than 4 partners.');
    }
    if (data.isMANAGER && managerCount >= 4) {
      throw new BadRequestException('Cannot add more than 4 managers.');
    }
    if (data.isACTIVE && activeCount >= 8) {
      throw new BadRequestException('Cannot add more than 8 active employees.');
    }

    return this.prisma.employee.create({
      data,
    });
  }

  async findAllEmployees(): Promise<Employee[]> {
    return this.prisma.employee.findMany();
  }

  async deleteEmployee(id: number): Promise<Employee> {
    return this.prisma.employee.delete({
      where: { id },
    });
  }
}