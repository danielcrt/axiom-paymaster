// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.23;

contract SimpleProtocol {
    mapping(address => uint256) lastRandomInput;

    event InputStored(address caller, uint256 value);

    function interact(uint256 randomInput) external {
        lastRandomInput[msg.sender] = randomInput;

        emit InputStored(msg.sender, randomInput);
    }
}
