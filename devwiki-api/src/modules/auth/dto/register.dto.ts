import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'nguyen.van.a@company.com',
    description: 'Địa chỉ email (dùng để đăng nhập)',
  })
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên đầy đủ',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống.' })
  fullName: string;

  @ApiProperty({
    example: 'StrongPass@123',
    description: 'Mật khẩu (tối thiểu 6 ký tự)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  password: string;
}
