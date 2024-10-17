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

  async executeSwap(
    hash: string,
  ): Promise<{ status: string; message: string; swapData: SwapData }> {
    this.logger.log(`Executing swap for hash: ${hash}`);
    try {
      const tx = await this.provider.getTransaction(hash);

      if (!tx) {
        throw new Error('Transaction not found');
      }

      this.logger.log('Waiting for transaction confirmation...');

      // Wait for at least one confirmation
      let receipt: ethers.TransactionReceipt | null = null;
      let confirmations = 0;
      while (!receipt || confirmations < 1) {
        try {
          receipt = await this.provider.getTransactionReceipt(hash);
          if (receipt) {
            confirmations = await receipt.confirmations();
          }
          if (!receipt || confirmations < 1) {
            this.logger.log(
              `Transaction not yet confirmed. Confirmations: ${confirmations}. Waiting...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before checking again
          }
        } catch (error) {
          this.logger.error(
            `Error checking transaction receipt: ${error.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        }
      }

      this.logger.log(
        `Transaction confirmed with ${confirmations} confirmation(s)`,
      );
      this.logger.debug(`Transaction receipt: ${JSON.stringify(receipt)}`);

      this.logger.log(
        `Transaction confirmed with ${receipt.confirmations} confirmation(s)`,
      );
      this.logger.debug(`Transaction receipt: ${JSON.stringify(receipt)}`);

      let swapData: SwapData = {
        hash,
        executed: false,
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

      // Perform checks
      if (
        swapData.tokenAddressOnSepolia !==
        '0xF57cE903E484ca8825F2c1EDc7F9EEa3744251eB'
      ) {
        this.logger.warn(
          `Invalid token address on Sepolia: ${swapData.tokenAddressOnSepolia}`,
        );
        return {
          status: 'error',
          message: 'Invalid token address on Sepolia',
          swapData,
        };
      }

      if (swapData.operator !== signer.address) {
        this.logger.warn(`Invalid recipient: ${swapData.operator}`);
        return { status: 'error', message: 'Invalid recipient', swapData };
      }

      // Execute the transfer on OP Sepolia
      this.logger.log(
        `Initiating transfer of ${swapData.amount} tokens to ${swapData.user} on OP Sepolia`,
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

      swapData.executed = true;
      swapData.sendTx = transferCall.hash;

      this.logger.log(`Swap executed: ${transferCall.hash}`);

      // Save the swap data
      const savedSwap = await this.databaseService.addSwap(swapData);
      this.logger.debug(`Swap saved to database: ${JSON.stringify(savedSwap)}`);

      await this.databaseService.updateAssetBalances(['Sepolia', 'OP Sepolia']);

      return {
        status: 'success',
        message: 'Swap executed successfully',
        swapData: savedSwap,
      };
    } catch (error) {
      this.logger.error(`Error executing swap: ${error.message}`, error.stack);
      return {
        status: 'error',
        message: `Error executing swap: ${error.message}`,
        swapData: null,
      };
    }
  }
}
