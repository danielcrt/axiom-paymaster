// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.23;

import { SimpleProtocol } from "../src/SimpleProtocol.sol";
import { BaseScript } from "./Base.s.sol";

contract InteractWithProtocol is BaseScript {
    function run() public broadcast {
        SimpleProtocol(0x8A6cF8A2F64da5b7Dcd9FC3FcF71Cce8fB2B3d7e).store(234);
    }
}
