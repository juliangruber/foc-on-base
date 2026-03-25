// SPDX-License-Identifier: (MIT or Apache-2.0)

pragma solidity ^0.8.19;

struct Order {
  string commp;
  uint amount;
  address sender;
}

contract FocOracle {
  Order[] orders;
  address fulfiller;

  event StoragePurchased(
    string commp,
    uint amount,
    uint index
  );

  constructor(address _fulfiller) {
    fulfiller = _fulfiller;
  }

  function purchaseStorage(string memory commp) public payable {
    Order memory order = Order(commp, msg.value, msg.sender);
    orders.push(order);
    emit StoragePurchased(commp, msg.value, orders.length - 1);
  }

  function fulfillOrder(uint index) public onlyFulfiller {
    Order memory order = orders[index];
    delete orders[index];
    payable(msg.sender).send(order.amount);
  }

  function rejectOrder(uint index) public onlyFulfiller {
    Order memory order = orders[index];
    delete orders[index];
    payable(order.sender).send(order.amount);
  }

  modifier onlyFulfiller() {
    require(msg.sender == fulfiller, "Not fulfiller");
    _;
  }
}