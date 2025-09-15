import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient, Admin } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createAdmin(createAdminDto: CreateAdminDto): Promise<Omit<Admin, 'password'>> {
    const { username, password, role } = createAdminDto;

    const existingUser = await this.prisma.admin.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await this.prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true, // Добавлено поле updatedAt
      },
    });

    return newAdmin;
  }

  async validateUser(username: string, passwordToCompare: string): Promise<Omit<Admin, 'password'> | null> {
    const user = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(passwordToCompare, user.password);

    if (isMatch) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  // Новый метод для получения всех админов (без паролей)
  async getAllAdmins(): Promise<Omit<Admin, 'password'>[]> {
    const admins = await this.prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true, // Добавлено поле updatedAt
      },
    });
    return admins;
  }
}
