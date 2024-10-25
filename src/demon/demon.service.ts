import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DemonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DemonService.name);
  private provider: ethers.JsonRpcProvider;
  private basicContract: ethers.Contract;
  private isListening = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_ENDPOINT_URL,
    );

    // BASIC token contract on Sepolia
    const basicAddress = '0xF57cE903E484ca8825F2c1EDc7F9EEa3744251eB';

    // ABI for Transfer event
    const abi = [
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ];

    this.basicContract = new ethers.Contract(basicAddress, abi, this.provider);
  }

  async onModuleInit() {
    this.logger.log('Initializing Demon Service...');
    await this.startListening();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Demon Service...');
    await this.stopListening();
  }

  private async startListening() {
    if (this.isListening) {
      return;
    }

    try {
      this.logger.log('Starting to listen for Transfer events...');

      this.basicContract.on('Transfer', (from, to, value, event) => {
        console.log('New tx! ✅');
        this.logger.debug(`
          Transfer Event Details:
          - From: ${from}
          - To: ${to}
          - Value: ${ethers.formatUnits(value, 18)}
          - Transaction Hash: ${event.log.transactionHash}
        `);
      });

      this.isListening = true;
      this.logger.log('Successfully started listening for events');
    } catch (error) {
      this.logger.error(`Failed to start listening: ${error.message}`);
      throw error;
    }
  }

  private async stopListening() {
    if (!this.isListening) {
      return;
    }

    try {
      await this.basicContract.removeAllListeners();
      this.isListening = false;
      this.logger.log('Successfully stopped listening for events');
    } catch (error) {
      this.logger.error(`Failed to stop listening: ${error.message}`);
      throw error;
    }
  }
}
