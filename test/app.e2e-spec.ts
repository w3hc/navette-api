import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({
        getSwaps: jest.fn().mockReturnValue([]),
        addSwap: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/swaps (GET)', () => {
    const mockSwaps = [
      {
        hash: 'test-hash',
        executed: false,
        user: '0x1234567890123456789012345678901234567890',
        operator: '0x0987654321098765432109876543210987654321',
        blockNumber: 12345,
        isERC20: true,
        tokenAddressOnSepolia: '0xabcdef1234567890abcdef1234567890abcdef12',
        tokenAddressOnOPSepolia: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 100,
        sendTx: '0xfedcba9876543210fedcba9876543210fedcba98',
      },
    ];
    jest.spyOn(databaseService, 'getSwaps').mockReturnValue(mockSwaps);

    return request(app.getHttpServer())
      .get('/swaps')
      .expect(200)
      .expect(mockSwaps);
  });

  it('/swaps (POST)', () => {
    const newSwap = { hash: 'new-test-hash' };
    const mockSwapData = {
      hash: 'new-test-hash',
      executed: false,
      user: '0x1234567890123456789012345678901234567890',
      operator: '0x0987654321098765432109876543210987654321',
      blockNumber: 12345,
      isERC20: true,
      tokenAddressOnSepolia: '0xabcdef1234567890abcdef1234567890abcdef12',
      tokenAddressOnOPSepolia: '0x1234567890abcdef1234567890abcdef12345678',
      amount: 100,
      sendTx: '0xfedcba9876543210fedcba9876543210fedcba98',
    };
    jest.spyOn(databaseService, 'addSwap').mockResolvedValue(mockSwapData);

    return request(app.getHttpServer())
      .post('/swaps')
      .send(newSwap)
      .expect(201)
      .expect({ message: 'Swap added successfully', swapData: mockSwapData });
  });
});
