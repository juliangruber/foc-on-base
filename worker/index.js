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
  FIL_PRIVATE_KEY
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

// TODO: This receives ETH, but pays in FIL. How to exchange?

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`)
  if (req.method === 'POST') {
    const body = await getRequestBody(req)
    const pieceCid = Piece.calculate(body)
    console.log({ pieceCid })
    let request
    for (let i = 0; i < 10; i++) {
      try {
        ;({ request } = await publicClient.simulateContract({
          account: privateKeyToAccount(BASE_PRIVATE_KEY),
          address: '0xD68cCC6dbcf0C976bBc51c4eEF89cd3a77eAFAc2',
          abi: FocOracle.abi,
          functionName: 'fulfillOrder',
          args: [pieceCid.toString()]
        }))
      } catch (err) {
        await setTimeout(5_000)
      }
    }

    if (!request) {
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
