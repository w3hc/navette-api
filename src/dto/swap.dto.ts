import { ApiProperty } from '@nestjs/swagger';

export class SwapDto {
  @ApiProperty({
    description: 'The transaction hash of your ERC20 transfer on Sepolia',
    example:
      '0xee56f3e01c1a1d3c14b0c8a398e8a21aa4bc79dedb5175c83a9ba6560f502156',
  })
  hash: string;
}
