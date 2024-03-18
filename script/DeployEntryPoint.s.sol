// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.23;

import { BaseScript } from "./Base.s.sol";
import { EntryPoint } from "account-abstraction/contracts/core/EntryPoint.sol";

contract DeployEntryPoint is BaseScript {
    function run() public broadcast returns (EntryPoint entryPoint) {
        entryPoint = new EntryPoint();
    }
}
