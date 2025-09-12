import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Извлекает токен из заголовка Authorization: Bearer
      ignoreExpiration: false, // Не игнорируем срок действия токена
      secretOrKey: 'dasdrhsdfgfjdtxcv', // Секретный ключ, должен быть таким же, как и при создании токена
    });
  }

  // Метод, который вызывается после успешной валидации токена
  async validate(payload: JwtPayload) {
    // В payload содержатся данные, которые мы сохранили в токен (id и role)
    // Здесь можно выполнить дополнительную проверку пользователя, если это необходимо
    return { id: payload.id, role: payload.role };
  }
} 