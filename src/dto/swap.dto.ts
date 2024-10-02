import { ApiProperty } from '@nestjs/swagger';

export class SwapDto {
  @ApiProperty({
    description: 'The hash of the swap',
    example: '0x1234567890abcdef',
  })
  hash: string;
}

export class ExecuteSwapDto {
  @ApiProperty({
    description: 'The hash of the swap to execute',
    example: '0x1234567890abcdef',
  })
  hash: string;
}
