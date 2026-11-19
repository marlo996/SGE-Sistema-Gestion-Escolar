import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
export const Roles=(...roles:Role[])=>SetMetadata('roles',roles);
export interface AuthUser {sub:string;role:Role;email:string}
@Injectable()
export class JwtAuthGuard implements CanActivate {
 constructor(private jwt:JwtService,private reflector:Reflector){}
 async canActivate(ctx:ExecutionContext):Promise<boolean>{
  const req=ctx.switchToHttp().getRequest();
  const auth=req.headers.authorization;
  if(typeof auth!=='string' || !auth.startsWith('Bearer ')) throw new UnauthorizedException('Sesión requerida');
  try {req.user=await this.jwt.verifyAsync<AuthUser>(auth.slice(7));}
  catch {throw new UnauthorizedException('Sesión inválida o expirada');}
  const roles=this.reflector.getAllAndOverride<Role[]>('roles',[ctx.getHandler(),ctx.getClass()]);
  if(roles && !roles.includes(req.user.role))throw new ForbiddenException('Rol no autorizado');
  return true;
 }
}
