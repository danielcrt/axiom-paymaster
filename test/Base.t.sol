// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.23;

import { Test } from "forge-std/Test.sol";
import { User, Users } from "./Types.sol";

abstract contract BaseTest is Test {
    Users internal users;

    function setUp() public virtual {
        users = Users({ deployer: createUser("Deployer"), u1: createUser("U1"), u2: createUser("U2") });

        vm.warp(MAY_1_2023);
    }

    function createUser(string memory name) internal returns (User memory user) {
        (address addr, uint256 pk) = makeAddrAndKey(name);
        vm.deal({ account: payable(addr), newBalance: 100 ether });
        return User({ addr: payable(addr), pk: pk });
    }
}
