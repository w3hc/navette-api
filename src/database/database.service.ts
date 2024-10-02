import { Injectable } from '@nestjs/common';
import * as lowdb from 'lowdb';
import * as FileSync from 'lowdb/adapters/FileSync';

type Schema = {
  swaps: { hash: string; executed: boolean }[];
};

@Injectable()
export class DatabaseService {
  private db: lowdb.LowdbSync<Schema>;

  constructor() {
    const adapter = new FileSync<Schema>('db.json');
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
