import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import * as fs from 'fs';
import * as path from 'path';

describe('AppModule', () => {
  let module: TestingModule;
  let dbService: DatabaseService;

  beforeEach(async () => {
    // Clear the database before each test
    const dbPath = path.join(process.cwd(), 'src', 'database', 'db.json');
    if (fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ swaps: [] }));
    }

    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dbService = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AppController', () => {
    const controller = module.get<AppController>(AppController);
    expect(controller).toBeDefined();
  });

  it('should have AppService', () => {
    const service = module.get<AppService>(AppService);
    expect(service).toBeDefined();
  });

  it('should have DatabaseService', () => {
    expect(dbService).toBeDefined();
  });

  it('should use custom database file path if provided', async () => {
    const customDbPath = path.join(process.cwd(), 'test', 'custom-db.json');
    process.env.DB_FILE_PATH = customDbPath;

    const customModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const customDbService = customModule.get<DatabaseService>(DatabaseService);

    customDbService.addSwap('testHash');
    const swaps = customDbService.getSwaps();
    expect(swaps).toContainEqual({ hash: 'testHash', executed: false });

    // Clean up
    await customModule.close();
    if (fs.existsSync(customDbPath)) {
      fs.unlinkSync(customDbPath);
    }
    delete process.env.DB_FILE_PATH;
  });

  it('should use default database file path if not provided', async () => {
    const initialSwaps = dbService.getSwaps();
    expect(initialSwaps.length).toBe(0);

    dbService.addSwap('defaultTestHash');
    const updatedSwaps = dbService.getSwaps();

    expect(updatedSwaps.length).toBe(1);
    expect(updatedSwaps).toContainEqual({
      hash: 'defaultTestHash',
      executed: false,
    });
  });
});
