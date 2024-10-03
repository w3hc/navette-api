import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { SwapService } from './swap/swap.service';
import * as path from 'path';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    SwapService,
    {
      provide: DatabaseService,
      useFactory: () => {
        const dbFilePath = path.join(
          process.cwd(),
          'src',
          'database',
          'db.json',
        );
        return new DatabaseService(dbFilePath);
      },
    },
  ],
})
export class AppModule {}
