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
    user: string;
    operator: string;
    blockNumber: number;
    isERC20: boolean;
    tokenAddressOnSepolia?: string;
    tokenAddressOnOPSepolia?: string;
    amount?: number;
    sendTx?: string;
  }[];
};

@Injectable()
export class DatabaseService {
  private db: lowdb.LowdbSync<Schema>;
  private provider: ethers.JsonRpcProvider;
  private providerOP: ethers.JsonRpcProvider;

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

    // Initialize Sepolia provider
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_ENDPOINT_URL);

    // Initialize OP Sepolia provider
    this.providerOP = new ethers.JsonRpcProvider(
      process.env.OP_SEPOLIA_RPC_ENDPOINT_URL,
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
        executed: true,
        user: tx.from,
        operator: tx.to!,
        blockNumber: receipt.blockNumber,
        isERC20: false,
      };

      let tokenAmount;
      let recipient;

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
        tokenAmount = ethers.formatUnits(decodedData.args[1], decimals);
        recipient = decodedData.args[0];
        const parsedTokenAmount = Number(parseFloat(tokenAmount).toFixed(2));

        swapData = {
          ...swapData,
          isERC20: true,
          operator: recipient,
          tokenAddressOnSepolia: tx.to!,
          tokenAddressOnOPSepolia: '0x2BE5A3e94240Ef08764eB9Bc16CbB917741C15a1',
          amount: parsedTokenAmount,
        };
      }

      console.log('tx:', tx);
      console.log('swapData:', swapData);

      const address = '0x2BE5A3e94240Ef08764eB9Bc16CbB917741C15a1';

      const signer = new ethers.Wallet(
        process.env.OPERATOR_PRIVATE_KEY,
        this.providerOP,
      );
      const abi = [
        {
          inputs: [
            {
              internalType: 'uint256',
              name: '_initialSupply',
              type: 'uint256',
            },
          ],
          stateMutability: 'nonpayable',
          type: 'constructor',
        },
        {
          inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'allowance', type: 'uint256' },
            { internalType: 'uint256', name: 'needed', type: 'uint256' },
          ],
          name: 'ERC20InsufficientAllowance',
          type: 'error',
        },
        {
          inputs: [
            { internalType: 'address', name: 'sender', type: 'address' },
            { internalType: 'uint256', name: 'balance', type: 'uint256' },
            { internalType: 'uint256', name: 'needed', type: 'uint256' },
          ],
          name: 'ERC20InsufficientBalance',
          type: 'error',
        },
        {
          inputs: [
            { internalType: 'address', name: 'approver', type: 'address' },
          ],
          name: 'ERC20InvalidApprover',
          type: 'error',
        },
        {
          inputs: [
            { internalType: 'address', name: 'receiver', type: 'address' },
          ],
          name: 'ERC20InvalidReceiver',
          type: 'error',
        },
        {
          inputs: [
            { internalType: 'address', name: 'sender', type: 'address' },
          ],
          name: 'ERC20InvalidSender',
          type: 'error',
        },
        {
          inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
          ],
          name: 'ERC20InvalidSpender',
          type: 'error',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'owner',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
          ],
          name: 'Approval',
          type: 'event',
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: 'address',
              name: 'from',
              type: 'address',
            },
            {
              indexed: true,
              internalType: 'address',
              name: 'to',
              type: 'address',
            },
            {
              indexed: false,
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
          ],
          name: 'Transfer',
          type: 'event',
        },
        {
          inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
          ],
          name: 'allowance',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'value', type: 'uint256' },
          ],
          name: 'approve',
          outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            { internalType: 'address', name: 'account', type: 'address' },
          ],
          name: 'balanceOf',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'decimals',
          outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            { internalType: 'uint256', name: '_amount', type: 'uint256' },
          ],
          name: 'mint',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [],
          name: 'name',
          outputs: [{ internalType: 'string', name: '', type: 'string' }],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'symbol',
          outputs: [{ internalType: 'string', name: '', type: 'string' }],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [],
          name: 'totalSupply',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
        {
          inputs: [
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'value', type: 'uint256' },
          ],
          name: 'transfer',
          outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            { internalType: 'address', name: 'from', type: 'address' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'value', type: 'uint256' },
          ],
          name: 'transferFrom',
          outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ];

      const erc20onOP = new ethers.Contract(address, abi, signer);

      console.log('erc20onOP:', await erc20onOP.name());
      console.log('signer:', signer);

      const status = 'available'; // TODO: replace with an db check (create an available table)

      console.log('recipient:', recipient);
      console.log('signer.address:', signer.address);

      ///// Checks /////

      if (
        swapData.tokenAddressOnSepolia !==
        '0xF57cE903E484ca8825F2c1EDc7F9EEa3744251eB'
      ) {
        return;
      }

      if (recipient !== signer.address) {
        return;
      }

      if ((await this.provider.getBlockNumber()) - swapData.blockNumber < 1) {
        return;
      }

      if (status !== 'available') {
        return;
      }

      const transferCall = await erc20onOP.transfer(
        tx.from,
        ethers.parseEther(tokenAmount),
      );
      const transferCallReceipt = await transferCall.wait(1);
      console.log('transferCallReceipt:', transferCallReceipt);

      swapData = {
        ...swapData,
        sendTx: transferCallReceipt.hash,
      };

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
