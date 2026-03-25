import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import * as Piece from '@filoz/synapse-core/piece'
import FocOracle from '../contracts/out/FocOracle.sol/FocOracle.json' with { type: 'json' }

const {
  PRIVATE_KEY
} = process.env

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
})

const walletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: baseSepolia,
  transport: http()
})

const data = new Uint8Array(65_536)
crypto.getRandomValues(data)

const pieceCid = Piece.calculate(data)
console.log({ pieceCid })

const { request } = await publicClient.simulateContract({
  account: privateKeyToAccount(PRIVATE_KEY),
  address: '0xD68cCC6dbcf0C976bBc51c4eEF89cd3a77eAFAc2',
  abi: FocOracle.abi,
  functionName: 'purchaseStorage',
  args: [pieceCid.toString()]
})
await walletClient.writeContractSync(request)

const res = await fetch('http://localhost:8000', {
  method: 'POST',
  body: data
})
console.log(res.status)
console.log(await res.text())
