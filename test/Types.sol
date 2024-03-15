// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.23;

struct User {
    address payable addr;
    uint256 pk;
}

struct Users {
    User deployer;
    User relayer;
    User u1;
    User u2;
}

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint128 callGasLimit;
    uint128 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    address paymaster;
    uint128 paymasterVerificationGasLimit;
    uint128 paymasterPostOpGasLimit;
    bytes paymasterData;
    bytes signature;
}
