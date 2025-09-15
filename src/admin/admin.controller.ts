import { Controller, Post, Body, UseGuards, Request, Get, UnauthorizedException } from '@nestjs/common';
import { AuthGuardJwt } from './guards/auth.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { Request as ExpressRequest } from 'express';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('auth/login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.adminService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    const payload = { id: user.id, role: user.role };
    return {
      token: this.jwtService.sign(payload),
    };
  }

  @UseGuards(AuthGuardJwt)
  @Get('auth/me')
  async getProfile(@Request() req: ExpressRequest) {
    return req.user;
  }

  // Этот маршрут доступен только суперадмину
  @UseGuards(AuthGuardJwt, SuperAdminGuard)
  @Post('create')
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    const newAdmin = await this.adminService.createAdmin(createAdminDto);
    return { message: 'Admin created successfully', admin: newAdmin };
  }

  // Новый роут для получения списка всех админов
  // Защищен, доступен только суперадмину
  @UseGuards(AuthGuardJwt, SuperAdminGuard)
  @Get('admins')
  async getAdmins() {
    return this.adminService.getAllAdmins();
  }
}