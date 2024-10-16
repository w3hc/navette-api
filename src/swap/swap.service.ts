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
        this.logger.error(`Transaction not found for hash: ${hash}`);
        throw new Error('Transaction not found');
      }

      this.logger.debug(`Transaction found: ${JSON.stringify(tx)}`);

      const receipt = await tx.wait();
      this.logger.debug(`Transaction receipt: ${JSON.stringify(receipt)}`);

      let swapData: SwapData = {
        hash,
        executed: true,
        user: tx.from,
        operator: tx.to!,
        blockNumber: receipt.blockNumber,
        isERC20: false,
      };

      let tokenAmount: string;
      let recipient: string;

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
        tokenAmount = ethers.formatUnits(decodedData.args[1], decimals);
        recipient = decodedData.args[0];
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

      const address = '0x2BE5A3e94240Ef08764eB9Bc16CbB917741C15a1';

      const signer = new ethers.Wallet(
        process.env.OPERATOR_PRIVATE_KEY!,
        this.providerOP,
      );
      this.logger.debug(`Signer address: ${signer.address}`);
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

      const status = 'available'; // TODO: replace with a db check (create an available table)

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

      if (recipient !== signer.address) {
        this.logger.warn(`Invalid recipient: ${recipient}`);
        return swapData;
      }

      const currentBlockNumber = await this.provider.getBlockNumber();
      if (currentBlockNumber - swapData.blockNumber < 1) {
        this.logger.warn(
          `Not enough confirmations. Current block: ${currentBlockNumber}, Swap block: ${swapData.blockNumber}`,
        );
        return swapData;
      }

      if (status !== 'available') {
        this.logger.warn(`Swap not available. Status: ${status}`);
        return swapData;
      }

      this.logger.log(
        `Initiating transfer of ${tokenAmount} tokens to ${tx.from}`,
      );
      const transferCall = await erc20onOP.transfer(
        tx.from,
        ethers.parseEther(tokenAmount!),
      );
      const transferCallReceipt = await transferCall.wait();

      swapData = {
        ...swapData,
        sendTx: transferCallReceipt.hash,
      };

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
