export const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }, 
]

export const balanceOf = async ({ client, account }) => {
  return await client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  })
}

export const allowance = async ({ client, owner, spender }) => {
  return await client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [
      owner,
      spender
    ],
  })
}

export const approve = async ({ client, spender, amount }) => {
  await client.writeContractSync({
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [
      spender, 
      amount
    ],
  })
}
