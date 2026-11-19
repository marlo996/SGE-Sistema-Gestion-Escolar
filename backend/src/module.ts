import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { AppController } from './routes';
import { AppService } from './service';
import { JwtAuthGuard } from './security';
if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32) throw Error('JWT_SECRET debe tener 32 caracteres como mínimo');
@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET,signOptions:{expiresIn:'8h'}})],controllers:[AppController],providers:[AppService,PrismaClient,JwtAuthGuard]})
export class AppModule {}
