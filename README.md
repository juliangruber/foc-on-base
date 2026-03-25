# foc-on-base
Deploying https://github.com/FilOzone/filecoin-services/ on base

## Approaches

### Deploy all of FOC on Base

✅

FOC contracts have been deployed on base.

❌

SPs aren't talking these contracts yet, therefore they aren't useful.

### Deploy FOC Oracle on Base

1. base client calls `FocOracle.purchaseStorage(commp)` on base
1. base client uploads data to oracle worker
1. Oracle worker creates storage deal on Filecoin

#### Client

See [./client/index.js](./client/index.js).

#### Contract

See [./contracts/src/FocOracle.sol](./contracts/src/FocOracle.sol).

#### Worker

See [./worker/index.js](./worker/index.js).

#### Storage flow

1. `Client` calculates data commP
1. `Client` calls `FocOracle.purchaseStorage(commp){ value: amount }`. The included ETH determines the storage duration.
1. `Client` uploads data to `Worker` via HTTP
1. `Worker` receives data (on good will, later: include upload fee)
1. `Worker` also computes commP
1. `Worker` calls `FocOracle.fulfillOrder(commp)`
  1. If order found:
    1. `FocOracle` sends ETH to `Worker`
    1. `Worker` makes storage deal using FIL
  1. If order not found:
    1. `Worker` deletes data 

Note: There's lots to improve here, and lots of scenarios not yet considered. For example:
- It's assumed that there only ever is one order for a particular commP
- Orders should be validated and if necessary rejected
- Only the fulfiller should be allowed to filfill orders
