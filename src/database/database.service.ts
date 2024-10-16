import { Injectable, Logger } from '@nestjs/common';
import * as lowdb from 'lowdb';
import * as FileSync from 'lowdb/adapters/FileSync';
import * as path from 'path';
import * as fs from 'fs';
import { SwapData } from '../types/swap.types';

type Schema = {
  swaps: SwapData[];
};

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private db: lowdb.LowdbSync<Schema>;

  constructor(dbFilePath?: string) {
    let dbFile: string;

    if (dbFilePath) {
      dbFile = dbFilePath;
    } else {
      const dbDirectory = path.join(process.cwd(), 'src', 'database');
      dbFile = path.join(dbDirectory, 'db.json');
    }

    // Ensure the directory exists
    const dbDir = path.dirname(dbFile);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const adapter = new FileSync<Schema>(dbFile);
    this.db = lowdb(adapter);

    // Set default data
    this.db.defaults({ swaps: [] }).write();
    this.logger.log(`Database initialized with file: ${dbFile}`);
  }

  addSwap(swapData: SwapData): SwapData {
    this.logger.log(`Adding swap to database: ${JSON.stringify(swapData)}`);
    this.db.get('swaps').push(swapData).write();
    return swapData;
  }

  getSwaps(): SwapData[] {
    this.logger.log('Retrieving all swaps from database');
    return this.db.get('swaps').value();
  }
}
