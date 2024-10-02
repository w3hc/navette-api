import { Injectable } from '@nestjs/common';
import * as lowdb from 'lowdb';
import * as FileSync from 'lowdb/adapters/FileSync';
import * as path from 'path';
import * as fs from 'fs';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

type Schema = {
  swaps: {
    hash: string;
    executed: boolean;
    from: string;
    to: string;
    value: string;
    blockNumber: number;
    isERC20: boolean;
    tokenAddress?: string;
    tokenAmount?: string;
  }[];
};

@Injectable()
export class DatabaseService {
  private db: lowdb.LowdbSync<Schema>;
  private provider: ethers.JsonRpcProvider;

  constructor(dbFilePath?: string) {
    let dbFile: string;

    if (dbFilePath) {
      dbFile = dbFilePath;
    } else {
      const dbDirectory = path.join(process.cwd(), 'src', 'database');
      dbFile = path.join(dbDirectory, 'db.json');
    }

    // Ensure the directory exists
    const dbDir = path.dirname(dbFile);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const adapter = new FileSync<Schema>(dbFile);
    this.db = lowdb(adapter);

    // Set default data
    this.db.defaults({ swaps: [] }).write();

    // Initialize Ethereum provider
    this.provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT_URL,
    );

    console.log('this.provider:', this.provider);
  }

  async addSwap(hash: string) {
    try {
      const tx = await this.provider.getTransaction(hash);

      if (!tx) {
        throw new Error('Transaction not found');
      }

      const receipt = await tx.wait();

      let swapData: Schema['swaps'][0] = {
        hash,
        executed: false,
        from: tx.from,
        to: tx.to!,
        value: tx.value.toString(),
        blockNumber: receipt.blockNumber,
        isERC20: false,
      };

      // Check if it's an ERC20 transaction
      if (tx.data && tx.data.startsWith('0xa9059cbb')) {
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

        swapData = {
          ...swapData,
          isERC20: true,
          to: decodedData.args[0],
          tokenAddress: tx.to!,
          tokenAmount: tokenAmount,
          value: '0', // ERC20 transfers typically have 0 ETH value
        };
      }

      console.log('tx:', tx);
      console.log('swapData:', swapData);

      this.db.get('swaps').push(swapData).write();
      return swapData;
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      throw error;
    }
  }

  getSwaps() {
    return this.db.get('swaps').value();
  }

  updateSwapStatus(hash: string, executed: boolean) {
    this.db.get('swaps').find({ hash }).assign({ executed }).write();
  }
}
