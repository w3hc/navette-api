import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrap, startServer } from './main';

describe('Main', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrap();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a Nest application', () => {
    expect(app).toBeDefined();
  });

  it('should set up Swagger', async () => {
    const response = await request(app.getHttpServer()).get('/api-json');
    expect(response.status).toBe(200);
    expect(response.body.info.title).toBe('Navette API');
  });

  it('should start the server', async () => {
    const { app: serverApp, server } = await startServer();
    expect(server.address().port).toBe(3000);
    await serverApp.close();
  });
});
