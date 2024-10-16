import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
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
    this.logger.log('Getting all swaps');
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
  ): Promise<{ message: string; swapData: SwapData }> {
    this.logger.log(`Executing swap with hash: ${swapDto.hash}`);
    const swapData = await this.swapService.executeSwap(swapDto.hash);
    this.logger.log(`Swap executed successfully: ${JSON.stringify(swapData)}`);
    return { message: 'Swap executed successfully', swapData };
  }
}
