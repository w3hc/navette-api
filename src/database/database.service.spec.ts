import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let tempDir: string;
  let dbFile: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-db-'));
    dbFile = path.join(tempDir, 'db.json');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DatabaseService,
          useFactory: () => {
            return new DatabaseService(dbFile);
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    // Clean up the temporary directory after each test
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it("should create the database file if it doesn't exist", () => {
    expect(fs.existsSync(dbFile)).toBeTruthy();
  });

  it('should initialize with an empty swaps array', () => {
    const swaps = service.getSwaps();
    expect(swaps).toEqual([]);
  });

  it('should add a swap', () => {
    service.addSwap('test-hash');
    const swaps = service.getSwaps();
    expect(swaps).toHaveLength(1);
    expect(swaps[0]).toEqual({ hash: 'test-hash', executed: false });
  });

  it('should return all swaps', () => {
    service.addSwap('hash1');
    service.addSwap('hash2');
    const swaps = service.getSwaps();
    expect(swaps).toHaveLength(2);
    expect(swaps).toEqual([
      { hash: 'hash1', executed: false },
      { hash: 'hash2', executed: false },
    ]);
  });
});
