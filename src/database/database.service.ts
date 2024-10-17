import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as lowdb from 'lowdb';
import * as FileSync from 'lowdb/adapters/FileSync';
import * as path from 'path';
import * as fs from 'fs';
import { SwapData } from '../types/swap.types';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

type Asset = {
  ticker: string;
  network: string;
  available: boolean;
  currentBalance: number;
  address: string;
  decimals: number;
};

type Schema = {
  swaps: SwapData[];
  assets: Asset[];
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private db: lowdb.LowdbSync<Schema>;
  private providers: { [key: string]: ethers.JsonRpcProvider } = {};

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
    const defaultData: Schema = {
      swaps: [],
      assets: [
        {
          ticker: 'BASIC',
          network: 'Sepolia',
          available: true,
          currentBalance: 0,
          address: '0xF57cE903E484ca8825F2c1EDc7F9EEa3744251eB',
          decimals: 18,
        },
        {
          ticker: 'BASIC',
          network: 'OP Sepolia',
          available: true,
          currentBalance: 0,
          address: '0x2BE5A3e94240Ef08764eB9Bc16CbB917741C15a1',
          decimals: 18,
        },
      ],
    };

    // Force write default data
    this.db.setState(defaultData).write();

    this.logger.log(`Database initialized with file: ${dbFile}`);
    this.logger.log(`Default data set: ${JSON.stringify(defaultData)}`);

    this.providers = {
      Sepolia: new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_ENDPOINT_URL),
      'OP Sepolia': new ethers.JsonRpcProvider(
        process.env.OP_SEPOLIA_RPC_ENDPOINT_URL,
      ),
    };
  }

  async onModuleInit() {
    this.logger.log('Initializing DatabaseService...');
    await this.updateAssetBalances();
    this.logger.log('DatabaseService initialized and asset balances updated.');
  }

  addSwap(swapData: SwapData): SwapData {
    this.logger.log(`Adding swap to database: ${JSON.stringify(swapData)}`);
    this.db.get('swaps').push(swapData).write();
    return swapData;
  }

  getSwaps(): SwapData[] {
    this.logger.log('Retrieving all swaps from database');
    return this.db.get('swaps').value();
  }

  async updateAssetBalances(networks?: string[]): Promise<void> {
    this.logger.log('Updating asset balances');
    const assets = this.db.get('assets').value();

    this.logger.log(`Current assets in DB: ${JSON.stringify(assets)}`);

    const signer = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY!);

    for (const asset of assets) {
      this.logger.log(
        `Processing asset: ${asset.ticker} on ${asset.network}: ${asset.address}`,
      );

      if (networks && !networks.includes(asset.network)) {
        continue;
      }

      const provider = this.providers[asset.network];
      if (!provider) {
        this.logger.warn(`No provider found for network: ${asset.network}`);
        continue;
      }

      const connectedSigner = signer.connect(provider);

      try {
        const tokenContract = new ethers.Contract(
          asset.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider,
        );
        const tokenBalance = await tokenContract.balanceOf(
          connectedSigner.address,
        );
        const balance = parseFloat(
          ethers.formatUnits(tokenBalance, asset.decimals),
        );

        this.db
          .get('assets')
          .find({ ticker: asset.ticker, network: asset.network })
          .assign({ currentBalance: balance })
          .write();

        this.logger.log(
          `Updated balance for ${asset.ticker} on ${asset.network}: ${balance}`,
        );
      } catch (error) {
        this.logger.error(
          `Error updating balance for ${asset.ticker} on ${asset.network}: ${error.message}`,
        );
      }
    }
  }

  getAssets(): Asset[] {
    return this.db.get('assets').value();
  }

  getAssetBalance(network: string, ticker: string): number | null {
    const asset = this.db.get('assets').find({ network, ticker }).value();

    if (asset) {
      return asset.currentBalance;
    }

    return null;
  }
}
