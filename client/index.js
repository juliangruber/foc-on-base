import { createPublicClient, createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import * as Piece from '@filoz/synapse-core/piece'
import FocOracle from '../contracts/out/FocOracle.sol/FocOracle.json' with { type: 'json' }
import * as USDC from '../shared/usdc.js'
import { setTimeout } from 'node:timers/promises'

const {
  BASE_PRIVATE_KEY,
  FOC_ORACLE_ADDRESS = '0x0793a77fB5481218acfb7606c52cEAE01ABaC1b7'
} = process.env

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
})

const walletClient = createWalletClient({
  account: privateKeyToAccount(BASE_PRIVATE_KEY),
  chain: baseSepolia,
  transport: http()
})

const [address] = await walletClient.getAddresses()
console.log('address', address)

const data = new Uint8Array(65_536)
crypto.getRandomValues(data)

const pieceCid = Piece.calculate(data)
console.log('pieceCid', pieceCid.toString())

// TODO: Make this configurable
const amount = parseUnits('0.0001', 6)
console.log('USDC amount to spend:', amount)

console.log('token balance:', await USDC.balanceOf({
  client: publicClient,
  account: address
}))

let allowance = await USDC.allowance({
  client: publicClient,
  owner: address,
  spender: FOC_ORACLE_ADDRESS
})
console.log('token allowance:', allowance)

if (allowance < amount) {
  console.log('approving token...')
  await USDC.approve({
    client: walletClient,
    spender: FOC_ORACLE_ADDRESS,
    amount
  })
  while (true) {
    allowance = await USDC.allowance({
      client: publicClient,
      owner: address,
      spender: FOC_ORACLE_ADDRESS
    })
    if (allowance >= amount) {
      break
    }
  }
}


console.log('purchasing storage...')
for (let i = 0; i < 10; i++) {
  try {
    const nonce = await publicClient.getTransactionCount({
      address,
    })
    const { request } = await publicClient.simulateContract({
      account: privateKeyToAccount(BASE_PRIVATE_KEY),
      address: FOC_ORACLE_ADDRESS,
      abi: FocOracle.abi,
      functionName: 'purchaseStorage',
      args: [amount, pieceCid.toString()],
      nonce
    })
    await walletClient.writeContractSync(request)
    break
  } catch (err) {
    if (i === 9) {
      throw err
    } else {
      console.log(err.message)
      console.log(`attempt ${i+1}, retrying in 10s...`)
      await setTimeout(10_000)
    }
  }
}

const res = await fetch('http://localhost:8000', {
  method: 'POST',
  body: data
})
console.log(res.status)
console.log(await res.text())
