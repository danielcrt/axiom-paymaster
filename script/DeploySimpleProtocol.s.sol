// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.23;

import { SimpleProtocol } from "../src/SimpleProtocol.sol";
import { BaseScript } from "./Base.s.sol";

contract DeploySimpleProtocol is BaseScript {
    function run() public broadcast returns (SimpleProtocol simpleProtocol) {
        simpleProtocol = new SimpleProtocol();
    }
}
