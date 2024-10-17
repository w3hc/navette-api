import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { DatabaseService } from './database/database.service';
import { SwapService } from './swap/swap.service';
import { SwapDto } from './dto/swap.dto';
import { SwapData } from './types/swap.types';

@ApiTags('swaps')
@Controller('swaps')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly swapService: SwapService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all swaps' })
  @ApiResponse({ status: 200, description: 'Return all swaps' })
  getSwaps(): SwapData[] {
    return this.databaseService.getSwaps();
  }

  @Post()
  @ApiOperation({ summary: 'Execute a new swap' })
  @ApiResponse({
    status: 201,
    description: 'The swap has been successfully executed',
  })
  @ApiBody({ type: SwapDto })
  async executeSwap(
    @Body() swapDto: SwapDto,
  ): Promise<{ message: string; status: string; swapData: SwapData }> {
    this.logger.log(`Executing swap with hash: ${swapDto.hash}`);
    const result = await this.swapService.executeSwap(swapDto.hash);

    if (result.status === 'error') {
      throw new HttpException(result.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return result;
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available balance for a specific asset' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current balance of the specified asset',
  })
  @ApiQuery({
    name: 'network',
    required: true,
    type: String,
    description: 'The network of the asset',
    example: 'Sepolia',
  })
  @ApiQuery({
    name: 'ticker',
    required: true,
    type: String,
    description: 'The ticker symbol of the asset',
    example: 'BASIC',
  })
  getAvailableBalance(
    @Query('network') network: string = 'Sepolia',
    @Query('ticker') ticker: string = 'BASIC',
  ): { currentBalance: number | null } {
    this.logger.log(`Getting available balance for ${ticker} on ${network}`);
    const balance = this.databaseService.getAssetBalance(network, ticker);
    return { currentBalance: balance };
  }
}
