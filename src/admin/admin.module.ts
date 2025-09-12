import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { AuthGuardJwt } from './guards/auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'dasdrhsdfgfjdtxcv', // Замените на реальный секретный ключ
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    JwtStrategy,
    SuperAdminGuard,
    AuthGuardJwt
  ],
})
export class AdminModule {}
