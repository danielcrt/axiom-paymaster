// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.23;

import { BaseScript } from "./Base.s.sol";
import { IEntryPoint } from "account-abstraction/contracts/interfaces/IEntryPoint.sol";

contract FundPaymaster is BaseScript {
    function run(address _entryPoint, address paymaster, uint256 amount) public broadcast {
        IEntryPoint entryPoint = IEntryPoint(_entryPoint);

        entryPoint.depositTo{ value: amount }(paymaster);
    }
}
