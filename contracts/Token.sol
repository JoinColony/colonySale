pragma solidity ^0.4.11;

import "./DSMath.sol";

contract Token is DSMath {
  event Transfer( address indexed from, address indexed to, uint value);
  event Approval( address indexed owner, address indexed spender, uint value);

  address resolver;
  uint256 _supply;
  mapping (address => uint256) _balances;
  mapping (address => mapping (address => uint256)) _approvals;

  function Token(){
  }

  function totalSupply() constant returns (uint256) {
    return _supply;
  }

  function balanceOf(address src) constant returns (uint256) {
    return _balances[src];
  }
}
