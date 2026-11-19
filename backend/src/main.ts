import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './module';
async function bootstrap(){
 const app=await NestFactory.create(AppModule);
 app.enableCors({origin:process.env.FRONTEND_URL || 'http://localhost:3000'});
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 await app.listen(Number(process.env.PORT || 3001));
 console.log('SGE backend iniciado');
}
bootstrap();
