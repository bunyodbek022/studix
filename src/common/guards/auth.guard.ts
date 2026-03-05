import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const token = req.cookies['accessToken'];
    if (!token) {
      throw new UnauthorizedException('Token missing in cookies');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      req['user'] = payload;
      return true;
    } catch (error) {
      console.log(error)
      throw new UnauthorizedException('Invalid token');
    }
  }
}
