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
    }).compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/swaps (GET)', () => {
    const mockSwaps = [{ hash: 'test-hash', executed: false }];
    jest.spyOn(databaseService, 'getSwaps').mockReturnValue(mockSwaps);

    return request(app.getHttpServer())
      .get('/swaps')
      .expect(200)
      .expect(mockSwaps);
  });

  it('/swaps (POST)', () => {
    const newSwap = { hash: 'new-test-hash' };

    return request(app.getHttpServer())
      .post('/swaps')
      .send(newSwap)
      .expect(201)
      .expect({ message: 'Swap added successfully' });
  });

  it('/swaps/:hash/execute (POST)', () => {
    const hashToExecute = 'test-hash-to-execute';

    return request(app.getHttpServer())
      .post(`/swaps/${hashToExecute}/execute`)
      .expect(200)
      .expect({ message: 'Swap executed successfully' });
  });
});
