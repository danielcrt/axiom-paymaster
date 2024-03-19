// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.23;

import { BaseScript } from "./Base.s.sol";
import { AxiomPaymaster } from "../src/AxiomPaymaster.sol";
import { AxiomV2Addresses } from "@axiom-crypto/axiom-std/AxiomV2Addresses.sol";
import { IEntryPoint } from "account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * This script is intended to be used only on Ethereum Sepolia
 */
contract DeployAxiomPaymaster is BaseScript {
    address public AXIOM_V2_QUERY_MOCK_SEPOLIA_ADDR;
    bytes32 _querySchema;

    function setUp() public {
        string memory artifact = vm.readFile("app/axiom/data/compiled.json");
        _querySchema = bytes32(vm.parseJson(artifact, ".querySchema"));

        AXIOM_V2_QUERY_MOCK_SEPOLIA_ADDR = AxiomV2Addresses.axiomV2QueryMockAddress(uint64(block.chainid));
    }

    function run(address entryPoint, uint256 maxRefundPerBlock) public broadcast returns (AxiomPaymaster paymaster) {
        paymaster = new AxiomPaymaster(
            IEntryPoint(entryPoint),
            AXIOM_V2_QUERY_MOCK_SEPOLIA_ADDR,
            uint64(block.chainid),
            _querySchema,
            maxRefundPerBlock
        );
    }
}
