import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { SwapDto } from './dto/swap.dto';

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
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    databaseService = app.get<DatabaseService>(DatabaseService);
  });

  describe('getSwaps', () => {
    it('should return all swaps', () => {
      const swaps = [
        {
          hash: 'test',
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
      jest.spyOn(databaseService, 'getSwaps').mockReturnValue(swaps);
      expect(appController.getSwaps()).toBe(swaps);
    });
  });

  describe('addSwap', () => {
    it('should add a swap', async () => {
      const swapDto: SwapDto = { hash: 'test-hash' };
      const mockSwapData = {
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
      };
      jest.spyOn(databaseService, 'addSwap').mockResolvedValue(mockSwapData);
      const result = await appController.addSwap(swapDto);
      expect(databaseService.addSwap).toHaveBeenCalledWith(swapDto.hash);
      expect(result).toEqual({
        message: 'Swap added successfully',
        swapData: mockSwapData,
      });
    });
  });
});
