import { IsString, IsNotEmpty, MinLength, IsEnum } from 'class-validator';

// Enum для ролей, чтобы избежать магических строк
export enum AdminRole {
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @IsEnum(AdminRole)
  @IsNotEmpty()
  role!: AdminRole;
}
