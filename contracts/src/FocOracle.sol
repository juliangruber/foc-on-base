// SPDX-License-Identifier: (MIT or Apache-2.0)

pragma solidity ^0.8.19;

import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

contract FocOracle {
  using SafeERC20 for IERC20;
  IERC20 token = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e);

  struct Order {
    string commp;
    uint amount;
    address sender;
    bool open;
  }

  mapping(string => Order) private orders;

  function purchaseStorage(uint amount, string memory commp) public {
    orders[commp] = Order(
      commp,
      transferIn(msg.sender, amount),
      msg.sender,
      true
    );
  }

  function fulfillOrder(string memory commp) public returns (Order memory) {
    Order memory order = orders[commp];
    require(order.open, "order not open");
    delete orders[commp];
    token.safeTransfer(msg.sender, order.amount);
    return order;
  }

  // https://github.com/FilOzone/filecoin-pay/blob/7bc77d86f94ef646721919426038a66290b862aa/src/FilecoinPayV1.sol#L799-L805
  function transferIn(address from, uint256 amount) internal returns (uint256 actual) {
    // handle fee-on-transfer and hidden-denominator tokens
    uint256 balanceBefore = token.balanceOf(address(this));
    token.safeTransferFrom(from, address(this), amount);
    uint256 balanceAfter = token.balanceOf(address(this));
    actual = balanceAfter - balanceBefore;
  }
}