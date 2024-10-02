import { Injectable } from '@nestjs/common';
import * as lowdb from 'lowdb';
import * as FileSync from 'lowdb/adapters/FileSync';
import * as path from 'path';
import * as fs from 'fs';

type Schema = {
  swaps: { hash: string; executed: boolean }[];
};

@Injectable()
export class DatabaseService {
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
  }

  getSwaps() {
    return this.db.get('swaps').value();
  }

  addSwap(hash: string) {
    this.db.get('swaps').push({ hash, executed: false }).write();
  }

  updateSwapStatus(hash: string, executed: boolean) {
    this.db.get('swaps').find({ hash }).assign({ executed }).write();
  }
}
