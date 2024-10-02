import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: DatabaseService,
      useFactory: () => {
        const dbFilePath = process.env.DB_FILE_PATH || 'data/db.json';
        return new DatabaseService(dbFilePath);
      },
    },
  ],
})
export class AppModule {}
