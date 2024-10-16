import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DatabaseService } from '../database/database.service';
import { SwapData } from '../types/swap.types';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);
  private provider: ethers.JsonRpcProvider;
  private providerOP: ethers.JsonRpcProvider;

  constructor(private databaseService: DatabaseService) {
    this.provider = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_ENDPOINT_URL,
    );
    this.providerOP = new ethers.JsonRpcProvider(
      process.env.OP_SEPOLIA_RPC_ENDPOINT_URL,
    );
    this.logger.log('SwapService initialized');
  }

  async executeSwap(hash: string): Promise<SwapData> {
    this.logger.log(`Executing swap for hash: ${hash}`);
    try {
      const tx = await this.provider.getTransaction(hash);

      if (!tx) {
        throw new Error('Transaction not found');
      }

      const receipt = await tx.wait();
      this.logger.debug(`Transaction receipt: ${JSON.stringify(receipt)}`);

      let swapData: SwapData = {
        hash,
        executed: false, // Set to false initially
        user: tx.from,
        operator: tx.to!,
        blockNumber: receipt.blockNumber,
        isERC20: false,
      };

      // Check if it's an ERC20 transaction
      if (tx.data && tx.data.startsWith('0xa9059cbb')) {
        this.logger.log('ERC20 transaction detected');
        const erc20Interface = new ethers.Interface([
          'function transfer(address to, uint256 amount)',
          'function decimals() view returns (uint8)',
        ]);
        const decodedData = erc20Interface.parseTransaction({ data: tx.data });

        // Get token decimals
        const tokenContract = new ethers.Contract(
          tx.to!,
          erc20Interface,
          this.provider,
        );
        const decimals = await tokenContract.decimals();

        // Calculate the actual token amount
        const tokenAmount = ethers.formatUnits(decodedData.args[1], decimals);
        const recipient = decodedData.args[0];
        const parsedTokenAmount = Number(parseFloat(tokenAmount).toFixed(2));

        this.logger.debug(
          `Token amount: ${parsedTokenAmount}, Recipient: ${recipient}`,
        );

        swapData = {
          ...swapData,
          isERC20: true,
          operator: recipient,
          tokenAddressOnSepolia: tx.to!,
          tokenAddressOnOPSepolia: '0x2BE5A3e94240Ef08764eB9Bc16CbB917741C15a1',
          amount: parsedTokenAmount,
        };
      }

      const signer = new ethers.Wallet(
        process.env.OPERATOR_PRIVATE_KEY!,
        this.providerOP,
      );
      this.logger.debug(`Signer address: ${signer.address}`);

      ///// Checks /////

      if (
        swapData.tokenAddressOnSepolia !==
        '0xF57cE903E484ca8825F2c1EDc7F9EEa3744251eB'
      ) {
        this.logger.warn(
          `Invalid token address on Sepolia: ${swapData.tokenAddressOnSepolia}`,
        );
        return swapData;
      }

      if (swapData.operator !== signer.address) {
        this.logger.warn(`Invalid recipient: ${swapData.operator}`);
        return swapData;
      }

      const currentBlockNumber = await this.provider.getBlockNumber();
      const requiredConfirmations = 1; // You can adjust this number as needed
      if (currentBlockNumber - swapData.blockNumber < requiredConfirmations) {
        this.logger.warn(
          `Not enough confirmations. Current block: ${currentBlockNumber}, Swap block: ${swapData.blockNumber}`,
        );
        return swapData;
      }

      // If all checks pass, proceed with the transfer
      this.logger.log(
        `Initiating transfer of ${swapData.amount} tokens to ${swapData.user}`,
      );
      const erc20onOP = new ethers.Contract(
        swapData.tokenAddressOnOPSepolia!,
        ['function transfer(address to, uint256 amount) returns (bool)'],
        signer,
      );

      const transferCall = await erc20onOP.transfer(
        swapData.user,
        ethers.parseUnits(swapData.amount!.toString(), 18), // Assuming 18 decimals, adjust if different
      );
      const transferCallReceipt = await transferCall.wait(1);

      swapData.executed = true;
      swapData.sendTx = transferCallReceipt.hash;

      this.logger.log(`Swap executed: ${transferCallReceipt.hash}`);

      // Call the database service to add the swap
      const savedSwap = await this.databaseService.addSwap(swapData);
      this.logger.debug(`Swap saved to database: ${JSON.stringify(savedSwap)}`);
      return savedSwap;
    } catch (error) {
      this.logger.error(`Error executing swap: ${error.message}`, error.stack);
      throw error;
    }
  }
}
