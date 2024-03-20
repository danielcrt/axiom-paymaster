// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.23;

import { Test } from "forge-std/Test.sol";
import { User, Users, UserOperation } from "./Types.sol";
import { SimpleAccount } from "../src/SimpleAccount.sol";
import { SimpleAccountFactory } from "../src/SimpleAccountFactory.sol";
import { IEntryPoint } from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { TestHelpers } from "./TestHelpers.sol";
import { SimpleProtocol } from "../src/SimpleProtocol.sol";

abstract contract BaseTest is Test, TestHelpers {
    Users internal users;
    SimpleAccount internal account;
    // https://sepolia.etherscan.io/address/0x7694f355fBca907e87FeB88a584363465dc66D8A
    IEntryPoint internal entryPoint = IEntryPoint(0x7694f355fBca907e87FeB88a584363465dc66D8A);
    // https://sepolia.etherscan.io/address/0xd0696B8127FEB08A595e31194dB08D3ee78158fF
    SimpleAccountFactory internal accountFactory = SimpleAccountFactory(0xd0696B8127FEB08A595e31194dB08D3ee78158fF);
    UserOperation internal userOp;
    // https://sepolia.etherscan.io/address/0x8A6cF8A2F64da5b7Dcd9FC3FcF71Cce8fB2B3d7e
    SimpleProtocol internal protocol = SimpleProtocol(0x8A6cF8A2F64da5b7Dcd9FC3FcF71Cce8fB2B3d7e);
    // https://sepolia.etherscan.io/address/0xFe7534363900492Fe14388F5779A3F772d5F42Eb
    SimpleAccount internal validAccount = SimpleAccount(payable(0xFe7534363900492Fe14388F5779A3F772d5F42Eb));

    function setUp() public virtual {
        users = Users({
            deployer: createUser("Deployer"),
            relayer: createUser("Relayer"),
            u1: createUser("U1"),
            u2: createUser("U2")
        });
        account = createAccount(users.u1);

        userOp = UserOperation({
            sender: address(0),
            nonce: 0,
            initCode: "",
            callData: "0x",
            callGasLimit: 150_000,
            verificationGasLimit: 150_000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
            preVerificationGas: 21_000, // should also cover calldata cost.
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1e9,
            paymaster: address(0),
            paymasterData: "0x",
            paymasterVerificationGasLimit: 3e5,
            paymasterPostOpGasLimit: 0,
            signature: "0x"
        });
    }

    function createUser(string memory name) internal returns (User memory user) {
        (address addr, uint256 pk) = makeAddrAndKey(name);
        vm.deal({ account: payable(addr), newBalance: 100 ether });
        return User({ addr: payable(addr), pk: pk });
    }

    function createAccount(User memory accountOwner) internal returns (SimpleAccount) {
        return accountFactory.createAccount(accountOwner.addr, 0);
    }
}
