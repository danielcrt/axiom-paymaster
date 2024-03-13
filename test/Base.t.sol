// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.23;

import { Test } from "forge-std/Test.sol";
import { User, Users, UserOperation } from "./Types.sol";
import { SimpleAccount } from "account-abstraction/contracts/samples/SimpleAccount.sol";
import { SimpleAccountFactory } from "account-abstraction/contracts/samples/SimpleAccountFactory.sol";
import { EntryPoint } from "account-abstraction/contracts/core/EntryPoint.sol";
import { TestHelpers } from "./TestHelpers.sol";
import { SimpleProtocol } from "../src/SimpleProtocol.sol";

abstract contract BaseTest is Test, TestHelpers {
    Users internal users;
    SimpleAccount internal account;
    EntryPoint internal entryPoint;
    UserOperation internal userOp;
    SimpleProtocol internal protocol;

    function setUp() public virtual {
        users = Users({ deployer: createUser("Deployer"), u1: createUser("U1"), u2: createUser("U2") });
        entryPoint = new EntryPoint();
        account = createAccount(users.u1);
        protocol = new SimpleProtocol();

        userOp = UserOperation({
            sender: address(0),
            nonce: 0,
            initCode: "",
            callData: "0x",
            callGasLimit: 150_000,
            verificationGasLimit: 150_000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
            preVerificationGas: 21_000, // should also cover calldata cost.
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 1e9,
            paymaster: address(0),
            paymasterData: "0x",
            paymasterVerificationGasLimit: 3e5,
            paymasterPostOpGasLimit: 0,
            signature: "0x"
        });

        vm.warp(1_682_899_200);
    }

    function createUser(string memory name) internal returns (User memory user) {
        (address addr, uint256 pk) = makeAddrAndKey(name);
        vm.deal({ account: payable(addr), newBalance: 100 ether });
        return User({ addr: payable(addr), pk: pk });
    }

    function createAccount(User memory accountOwner) internal returns (SimpleAccount) {
        SimpleAccountFactory accountFactory = new SimpleAccountFactory(entryPoint);
        return accountFactory.createAccount(accountOwner.addr, 0);
    }
}
