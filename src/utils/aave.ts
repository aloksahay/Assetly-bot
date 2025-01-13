import { ethers } from 'ethers'

// AAVE V3 Sepolia Addresses
const AAVE_ADDRESSES = {
  POOL: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
  POOL_ADDRESSES_PROVIDER: '0x0496275d34753A48320CA58103d5220d394FF77F',
  USDC: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8'  // Sepolia USDC
}

// AAVE V3 Pool ABI (minimal for deposit)
const AAVE_POOL_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "asset", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "address", "name": "onBehalfOf", "type": "address"},
      {"internalType": "uint16", "name": "referralCode", "type": "uint16"}
    ],
    "name": "supply",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
]

interface AavePool extends ethers.BaseContract {
  supply(
    asset: string,
    amount: string,
    onBehalfOf: string,
    referralCode: number
  ): Promise<ethers.ContractTransactionResponse>;
  getUserAccountData(
    user: string
  ): Promise<[bigint, bigint, bigint, bigint, bigint, bigint]>;
}

export class AaveService {
  private provider: ethers.Provider
  private pool: AavePool

  constructor(provider: ethers.Provider) {
    if (!provider) {
      throw new Error('Provider is required')
    }
    this.provider = provider
    this.pool = new ethers.Contract(
      AAVE_ADDRESSES.POOL, 
      AAVE_POOL_ABI, 
      provider
    ) as unknown as AavePool;
  }

  async deposit(
    amount: string,
    signer: ethers.Signer
  ) {
    if (!amount || !signer) {
      throw new Error('Amount and signer are required')
    }

    try {
      const poolWithSigner = this.pool.connect(signer)
      
      console.log('Approving AAVE to spend USDC...')
      const erc20 = new ethers.Contract(
        AAVE_ADDRESSES.USDC,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      )
      
      const approveTx = await erc20.approve(AAVE_ADDRESSES.POOL, amount)
      await approveTx.wait()
      console.log('Approval successful')

      console.log('Depositing to AAVE...')
      const depositTx = await this.pool.supply(
        AAVE_ADDRESSES.USDC,
        amount,
        await signer.getAddress(),
        0
      )

      console.log('Waiting for deposit confirmation...')
      await depositTx.wait()
      console.log('Deposit successful')

      return depositTx

    } catch (error) {
      console.error('AAVE deposit failed:', error)
      throw error
    }
  }

  async getUserData(address: string) {
    if (!address) {
      throw new Error('Address is required')
    }
    return this.pool.getUserAccountData(address)
  }
} 