// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@axiom-crypto/axiom-std/AxiomTest.sol";

import { AxiomPaymaster } from "../src/AxiomPaymaster.sol";
import { EntryPoint } from "../src/EntryPoint.sol";
import { BaseTest } from "./Base.t.sol";

contract AxiomPaymasterTest is AxiomTest, BaseTest {
    using Axiom for Query;

    struct AxiomInput {
        uint64 blockNumber;
        address addr;
    }

    AxiomInput public input;
    bytes32 public querySchema;
    EntryPoint public entryPoint;
    AxiomPaymaster public paymaster;

    function setUp() override public {
        BaseTest.setUp();

        uint256 maxRefundPerBlock = 21_000;

        _createSelectForkAndSetupAxiom("sepolia", 5_103_100);

        input = AxiomInput({ blockNumber: 4_205_938, addr: address(0x8018fe32fCFd3d166E8b4c4E37105318A84BA11b) });
        querySchema = axiomVm.readCircuit("app/axiom/power-user.circuit.ts");

        entryPoint = new EntryPoint();
        paymaster = new AxiomPaymaster(
            entryPoint.address, axiomV2QueryAddress, uint64(block.chainid), querySchema, maxRefundPerBlock
        );
    }

    function test_paymaster_rejects_if_postOpGasLimit_too_low() public {
        uint256 paymasterPostOpGasLimit = paymaster.REFUND_POST_OP_COST();
        UserOperation op = fillUserOp({
            sender: account.address,
            paymaster: paymasterAddress,
            paymasterVerificationGasLimit: 3e5,
            paymasterPostOpGasLimit: paymasterPostOpGasLimit - 1, // too low
            callData
        }, entryPoint);
            
    // op = signUserOp(op, accountOwner, entryPoint.address, chainId)
    // const opPacked = packUserOp(op)
    // // await expect(
    // expect(await entryPoint.handleOps([opPacked], beneficiaryAddress, { gasLimit: 1e7 })
    //   .catch(e => decodeRevertReason(e)))
    //   .to.match(/TPM: postOpGasLimit too low/)

    }


    /// @dev Simple demonstration of testing an Axiom client contract using Axiom cheatcodes
    function test_simple_example() public {
        // create a query into Axiom with default parameters
        Query memory q = query(querySchema, abi.encode(input), address(averageBalance));

        // send the query to Axiom
        q.send();

        // prank fulfillment of the query, returning the Axiom results
        bytes32[] memory results = q.prankFulfill();

        // parse Axiom results and verify length is as expected
        assertEq(results.length, 3);
        uint256 blockNumber = uint256(results[0]);
        address addr = address(uint160(uint256(results[1])));
        uint256 avg = uint256(results[2]);

        // verify the average balance recorded in AverageBalance is as expected
        assertEq(avg, averageBalance.provenAverageBalances(blockNumber, addr));
    }
}
