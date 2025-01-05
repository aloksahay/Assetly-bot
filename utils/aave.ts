import { ethers } from 'ethers'

// AAVE V3 Sepolia Addresses
const AAVE_ADDRESSES = {
  POOL: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
  POOL_ADDRESSES_PROVIDER: '0x0496275d34753A48320CA58103d5220d394FF77F',
  USDC: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8'  // Sepolia USDC
}

// AAVE V3 Pool ABI (minimal for deposit)
const AAVE_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
]

export class AaveService {
  private provider: ethers.Provider
  private pool: ethers.Contract

  constructor(provider: ethers.Provider) {
    this.provider = provider
    this.pool = new ethers.Contract(AAVE_ADDRESSES.POOL, AAVE_POOL_ABI, provider)
  }

  async deposit(
    amount: string,
    signer: ethers.Signer
  ) {
    try {
      const poolWithSigner = this.pool.connect(signer)
      
      console.log('Approving AAVE to spend USDC...')
      // First approve AAVE to spend tokens
      const erc20 = new ethers.Contract(
        AAVE_ADDRESSES.USDC,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      )
      
      const approveTx = await erc20.approve(AAVE_ADDRESSES.POOL, amount)
      await approveTx.wait()
      console.log('Approval successful')

      console.log('Depositing to AAVE...')
      // Then deposit into AAVE
      const depositTx = await poolWithSigner.supply(
        AAVE_ADDRESSES.USDC,  // asset (USDC)
        amount,               // amount
        await signer.getAddress(), // onBehalfOf
        0                    // referralCode
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
    return this.pool.getUserAccountData(address)
  }
} 