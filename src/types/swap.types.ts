export interface SwapData {
  hash: string;
  executed: boolean;
  user: string;
  operator: string;
  blockNumber: number;
  isERC20: boolean;
  tokenAddressOnSepolia?: string;
  tokenAddressOnOPSepolia?: string;
  amount?: number;
  sendTx?: string;
}
