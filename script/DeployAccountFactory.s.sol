// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.23;

import { BaseScript } from "./Base.s.sol";
import { SimpleAccountFactory } from "account-abstraction/contracts/samples/SimpleAccountFactory.sol";
import { IEntryPoint } from "account-abstraction/contracts/interfaces/IEntryPoint.sol";

contract DeployAccountFactory is BaseScript {
    function run(address entryPoint) public broadcast returns (SimpleAccountFactory accountFactory) {
        accountFactory = new SimpleAccountFactory(IEntryPoint(entryPoint));
    }
}
