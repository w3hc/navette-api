import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseService } from './database/database.service';
import { SwapService } from './swap/swap.service';
import { DemonService } from './demon/demon.service';
import * as path from 'path';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    SwapService,
    DemonService,
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
