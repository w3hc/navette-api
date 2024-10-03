import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DatabaseService } from './database/database.service';
import { SwapDto } from './dto/swap.dto';

@ApiTags('swaps')
@Controller('swaps')
export class AppController {
  constructor(private readonly databaseService: DatabaseService) {}

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
  async addSwap(@Body() swapDto: SwapDto) {
    const swapData = await this.databaseService.addSwap(swapDto.hash);
    return { message: 'Swap added successfully', swapData: swapData };
  }
}
