import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { SwapDto, ExecuteSwapDto } from './dto/swap.dto';

describe('AppController', () => {
  let appController: AppController;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DatabaseService,
          useValue: {
            getSwaps: jest.fn(),
            addSwap: jest.fn(),
            updateSwapStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    databaseService = app.get<DatabaseService>(DatabaseService);
  });

  describe('getSwaps', () => {
    it('should return all swaps', () => {
      const swaps = [{ hash: 'test', executed: false }];
      jest.spyOn(databaseService, 'getSwaps').mockReturnValue(swaps);
      expect(appController.getSwaps()).toBe(swaps);
    });
  });

  describe('addSwap', () => {
    it('should add a swap', () => {
      const swapDto: SwapDto = { hash: 'test-hash' };
      const result = appController.addSwap(swapDto);
      expect(databaseService.addSwap).toHaveBeenCalledWith(swapDto.hash);
      expect(result).toEqual({ message: 'Swap added successfully' });
    });
  });

  describe('executeSwap', () => {
    it('should execute a swap', () => {
      const executeSwapDto: ExecuteSwapDto = {
        hash: 'test-hash',
      };
      const result = appController.executeSwap(executeSwapDto);
      expect(databaseService.updateSwapStatus).toHaveBeenCalledWith(
        executeSwapDto.hash,
        true,
      );
      expect(result).toEqual({ message: 'Swap executed successfully' });
    });
  });
});
