import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { createServer } from 'node:http' 
import { once } from 'node:events'
import { Synapse } from '@filoz/synapse-sdk'
import FocOracle from '../contracts/out/FocOracle.sol/FocOracle.json' with { type: 'json' }
import { getRequestBody } from './lib/request.js'
import * as Piece from '@filoz/synapse-core/piece'
import { setTimeout } from 'node:timers/promises'

const {
  BASE_PRIVATE_KEY,
  FIL_PRIVATE_KEY,
  FOC_ORACLE_ADDRESS = '0x0793a77fB5481218acfb7606c52cEAE01ABaC1b7'
} = process.env

const synapse = Synapse.create({
  account: privateKeyToAccount(FIL_PRIVATE_KEY),
  source: 'foc-on-base-worker'
})

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
})

const walletClient = createWalletClient({
  account: privateKeyToAccount(BASE_PRIVATE_KEY),
  chain: baseSepolia,
  transport: http()
})

// TODO: This receives USDC, but pays in USDFC. Need to exchange

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`)
  if (req.method === 'POST') {
    const body = await getRequestBody(req)
    const pieceCid = Piece.calculate(body)
    console.log('pieceCid:', pieceCid.toString())
    let request
    for (let i = 0; i < 10; i++) {
      try {
        ;({ request } = await publicClient.simulateContract({
          account: privateKeyToAccount(BASE_PRIVATE_KEY),
          address: FOC_ORACLE_ADDRESS,
          abi: FocOracle.abi,
          functionName: 'fulfillOrder',
          args: [pieceCid.toString()]
        }))
      } catch (err) {
        await setTimeout(5_000)
      }
    }

    if (!request) {
      res.statusCode = 400
      return res.end('order not found')
    }

    await walletClient.writeContractSync(request)
    console.log('order found, uploading...')
    // TODO: Set storage duration based on `order.amount`
    await synapse.storage.upload(body, { pieceCid })
    console.log('uploaded')
    res.end('ok')
  } else {
    res.end('not supported')
  }
})
server.listen(8000)
await once(server, 'listening')
console.log('http://localhost:8000')
