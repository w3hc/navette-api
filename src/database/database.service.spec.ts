import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import * as fs from 'fs';
import * as lowdb from 'lowdb';
import * as FileSync from 'lowdb/adapters/FileSync';

jest.mock('lowdb');
jest.mock('lowdb/adapters/FileSync');

describe('DatabaseService', () => {
  let service: DatabaseService;
  const mockDb = {
    defaults: jest.fn().mockReturnThis(),
    write: jest.fn(),
    get: jest.fn().mockReturnThis(),
    push: jest.fn().mockReturnThis(),
    find: jest.fn().mockReturnThis(),
    assign: jest.fn().mockReturnThis(),
    value: jest.fn(),
  };

  beforeEach(async () => {
    (lowdb as jest.MockedFunction<any>).mockReturnValue(mockDb);
    (FileSync as jest.MockedClass<any>).mockImplementation(() => ({}));

    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize the database with default data', () => {
    expect(FileSync).toHaveBeenCalledWith('db.json');
    expect(lowdb).toHaveBeenCalled();
    expect(mockDb.defaults).toHaveBeenCalledWith({ swaps: [] });
    expect(mockDb.write).toHaveBeenCalled();
  });

  it('should get all swaps', () => {
    const mockSwaps = [{ hash: 'hash1', executed: false }];
    mockDb.value.mockReturnValue(mockSwaps);

    const swaps = service.getSwaps();

    expect(mockDb.get).toHaveBeenCalledWith('swaps');
    expect(swaps).toEqual(mockSwaps);
  });

  it('should add a swap', () => {
    service.addSwap('test-hash');

    expect(mockDb.get).toHaveBeenCalledWith('swaps');
    expect(mockDb.push).toHaveBeenCalledWith({
      hash: 'test-hash',
      executed: false,
    });
    expect(mockDb.write).toHaveBeenCalled();
  });

  it('should update swap status', () => {
    service.updateSwapStatus('test-hash', true);

    expect(mockDb.get).toHaveBeenCalledWith('swaps');
    expect(mockDb.find).toHaveBeenCalledWith({ hash: 'test-hash' });
    expect(mockDb.assign).toHaveBeenCalledWith({ executed: true });
    expect(mockDb.write).toHaveBeenCalled();
  });
});
