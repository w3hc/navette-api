import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Enable all log levels
  });

  const config = new DocumentBuilder()
    .setTitle('Navette API')
    .setDescription(
      "Send some BASIC tokens on Sepolia (https://sepolia.etherscan.io/address/0xF57cE903E484ca8825F2c1EDc7F9EEa3744251eB#writeContract) to the operator's address (0xd6B159d56749BeE815dF460FB373B2A1EC1517A8) and give this transaction hash as a parameter of your /swap POST request, you will receive the equivalent amount on OP Sepolia (https://sepolia-optimism.etherscan.io/address/0x2be5a3e94240ef08764eb9bc16cbb917741c15a1). Use the /available endpoint to check the current balance of a specific asset.",
    )
    .setVersion('0.1')
    .addTag('swaps', 'Swap-related endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  return app;
}

export async function startServer() {
  const app = await bootstrap();
  const server = await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  return { app, server };
}

if (require.main === module) {
  startServer();
}
