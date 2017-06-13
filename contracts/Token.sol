/// base.sol -- basic ERC20 implementation

// Copyright (C) 2015, 2016, 2017  DappHub, LLC

// Licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License.

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND (express or implied).

pragma solidity ^0.4.11;

import "./erc20.sol";
import "./math.sol";

contract Token is ERC20, DSMath {
    address resolver;
    uint256 _supply;
    mapping (address => uint256) _balances;
    mapping (address => mapping (address => uint256)) _approvals;

    function Token() {
    }

    function totalSupply() constant returns (uint256) {
        return _supply;
    }
    
    function balanceOf(address src) constant returns (uint256) {
        return _balances[src];
    }

    function mint(uint128 wad) {
        _balances[msg.sender] = add(_balances[msg.sender], wad);
        _supply = add(_supply, wad);
    }
}
