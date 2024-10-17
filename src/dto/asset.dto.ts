import { ApiProperty } from '@nestjs/swagger';

export class AvailableBalanceDto {
  @ApiProperty({
    description: 'The network of the asset',
    example: 'Sepolia',
  })
  network: string;

  @ApiProperty({
    description: 'The ticker symbol of the asset',
    example: 'BASIC',
  })
  ticker: string;
}
