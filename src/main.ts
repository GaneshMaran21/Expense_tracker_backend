import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService)
  const port_number = configService.get<number>('PORT') ?? 3000

  // Enable cookie parser
  app.use(cookieParser());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Swagger for my APIS')
    .setDescription('API description')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document); 

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.enableCors({
    origin: true, // Allow all origins for mobile apps
    credentials: true,
  });

  await app.listen(port_number,'0.0.0.0');
  console.log(`App is running on port ${port_number}`)
}

bootstrap();