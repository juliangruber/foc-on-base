// SPDX-License-Identifier: (MIT or Apache-2.0)

pragma solidity ^0.8.19;

struct Order {
  string commp;
  uint amount;
  address sender;
  bool open;
}

contract FocOracle {
  mapping(string => Order) private orders;

  function purchaseStorage(string memory commp) public payable {
    Order memory order = Order(commp, msg.value, msg.sender, true);
    orders[commp] = order;
  }

  function fulfillOrder(string memory commp) public returns (Order memory) {
    Order memory order = orders[commp];
    require(order.open, "order not open");
    delete orders[commp];
    payable(msg.sender).send(order.amount);
    return order;
  }
}