import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Получаем данные пользователя из запроса

    if (user && user.role === 'superadmin') {
      return true; // Разрешить доступ
    }

    throw new ForbiddenException('Access denied. Only Super Admin can perform this action.');
  }
}