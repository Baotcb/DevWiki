import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'nguyen.van.a@company.com',
    description: 'Địa chỉ email đăng nhập',
  })
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;

  @ApiProperty({
    example: 'StrongPass@123',
    description: 'Mật khẩu',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  password: string;
}
