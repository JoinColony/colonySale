pragma solidity ^0.4.9;

import "zeppelin/SafeMath.sol";
import "zeppelin/token/ERC20.sol";

contract CLNY is ERC20 {
  string public constant name = "Colony Network Token";
  string public constant symbol = "CLNY";
  uint public constant decimals = 18;
}
