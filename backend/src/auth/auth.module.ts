import { Body, Controller, Injectable, Module, Post, UnauthorizedException, Get } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Publico, Roles, TODOS } from '../common/roles';
import { Usuario, UsuarioJwt } from '../common/usuario.decorator';

export const jwtSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('Defina JWT_SECRET en el entorno');
  return s;
};

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: jwtSecret() });
  }
  async validate(p: { sub: number }): Promise<UsuarioJwt> {
    const u = await this.prisma.usuario.findUnique({ where: { id: p.sub } });
    if (!u || !u.activo) throw new UnauthorizedException();
    return { id: u.id, email: u.email, rol: u.rol };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  @Publico()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const u = await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!u || !u.activo || !(await bcrypt.compare(dto.password, u.passwordHash))) throw new UnauthorizedException('Correo o contraseña incorrectos');
    const token = await this.jwt.signAsync({ sub: u.id, rol: u.rol });
    return { token, usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } };
  }

  @Get('yo') @Roles(...TODOS)
  yo(@Usuario() u: UsuarioJwt) {
    return u;
  }
}

@Module({
  imports: [PassportModule, JwtModule.registerAsync({ useFactory: () => ({ secret: jwtSecret(), signOptions: { expiresIn: '12h' } }) })],
  controllers: [AuthController],
  providers: [JwtStrategy],
})
export class AuthModule {}
