import { Controller, Get, Post, Body, Param, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { SwapDto, ExecuteSwapDto } from './dto/swap.dto';

@ApiTags('swaps')
@Controller('swaps')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all swaps' })
  @ApiResponse({ status: 200, description: 'Return all swaps' })
  getSwaps() {
    return this.databaseService.getSwaps();
  }

  @Post()
  @ApiOperation({ summary: 'Add a new swap' })
  @ApiResponse({
    status: 201,
    description: 'The swap has been successfully created',
  })
  @ApiBody({ type: SwapDto })
  addSwap(@Body() swapDto: SwapDto) {
    this.databaseService.addSwap(swapDto.hash);
    return { message: 'Swap added successfully' };
  }

  @Post(':hash/execute')
  @HttpCode(200) // This line ensures a 200 status code is returned
  @ApiOperation({ summary: 'Execute a swap' })
  @ApiResponse({
    status: 200,
    description: 'The swap has been successfully executed',
  })
  executeSwap(@Param() executeSwapDto: ExecuteSwapDto) {
    this.databaseService.updateSwapStatus(executeSwapDto.hash, true);
    return { message: 'Swap executed successfully' };
  }
}
