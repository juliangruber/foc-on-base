import { createPublicClient, createWalletClient, http, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { createServer } from 'node:http' 
import { once } from 'node:events'
import { Synapse } from '@filoz/synapse-sdk'
import FocOracle from '../contracts/out/FocOracle.sol/FocOracle.json' with { type: 'json' }
import { getRequestBody } from './lib/request.js'
import * as Piece from '@filoz/synapse-core/piece'
import { setTimeout } from 'node:timers/promises'
import { Squid } from "@0xsquid/sdk"
import * as USDC from '../shared/usdc.js'
import assert from 'node:assert/strict'

const {
  BASE_PRIVATE_KEY,
  FIL_PRIVATE_KEY,
  FOC_ORACLE_ADDRESS = '0x0793a77fB5481218acfb7606c52cEAE01ABaC1b7',
  SQUID_INTEGRATOR_ID
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

const [baseAddress] = await walletClient.getAddresses()
console.log('base address', baseAddress)

const squid = new Squid({
  baseUrl: 'https://apiplus.squidrouter.com',
  integratorId: SQUID_INTEGRATOR_ID,
})
await squid.init()

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`)
  if (req.method === 'POST') {
    const body = await getRequestBody(req)
    const pieceCid = Piece.calculate(body)
    console.log('pieceCid:', pieceCid.toString())
    let request, order
    for (let i = 0; i < 10; i++) {
      try {
        ;({ request, result: order } = await publicClient.simulateContract({
          account: privateKeyToAccount(BASE_PRIVATE_KEY),
          address: FOC_ORACLE_ADDRESS,
          abi: FocOracle.abi,
          functionName: 'fulfillOrder',
          args: [pieceCid.toString()]
        }))
        break
      } catch (err) {
        await setTimeout(5_000)
      }
    }

    if (!request) {
      res.statusCode = 400
      return res.end('order not found')
    }

    console.log('order found:', order)

    console.log('claiming order...')
    await walletClient.writeContractSync(request)
    console.log('order claimed')

    console.log('checking funds received...')
    const balance = await USDC.balanceOf({
      client: publicClient,
      account: baseAddress
    })
    console.log('balance:', formatUnits(balance, 6), 'USDC')
    assert(balance >= order.amount, 'did not receive funds!')
    console.log('balance sufficient')

    console.log('swapping USDC for USDFC...')
    console.log('Squid does not support testnets. since this is a hackathon')
    console.log('project, I don\'t want to use real funds. <Insert funds')
    console.log('swapping here>')
    // console.log('getting route...')
    // const { route } = await squid.getRoute({
    //   fromChain: '84532',
    //   toChain: '314159',
    //   fromToken: USDC.token,
    //   toToken: '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0',
    //   fromAmount: order.amount.toString(),
    //   fromAddress: baseAddress,
    //   toAddress: baseAddress,
    //   slippage: 1.0, // 1%
    // })
    // console.log('route found')
    // console.log('estimated USDFC to receive:', route.estimate.toAmount)

    console.log('uploading...')
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
