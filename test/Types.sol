// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.23;

struct User {
    address payable addr;
    uint256 pk;
}

struct Users {
    User deployer;
    User u1;
    User u2;
}
