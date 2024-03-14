// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.23;

contract SimpleProtocol {
    mapping(address => uint256) lastRandomInput;

    event StoreInput(address indexed caller, uint256 value);

    function store(uint256 randomInput) external {
        lastRandomInput[msg.sender] = randomInput;

        emit StoreInput(msg.sender, randomInput);
    }
}
