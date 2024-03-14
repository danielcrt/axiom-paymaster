// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@axiom-crypto/axiom-std/AxiomTest.sol";

import { PackedUserOperation } from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import { IEntryPoint } from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { AxiomPaymaster } from "../src/AxiomPaymaster.sol";
import { EntryPoint } from "../src/EntryPoint.sol";
import { SimpleProtocol } from "../src/SimpleProtocol.sol";
import { BaseTest } from "./Base.t.sol";
import { TestHelpers } from "./TestHelpers.sol";
import { SimpleAccount } from "account-abstraction/contracts/samples/SimpleAccount.sol";
import "forge-std/console.sol";

contract AxiomPaymasterTest is AxiomTest, BaseTest {
    using Axiom for Query;

    struct AxiomInput {
        uint64 blockNumber;
        address addr;
    }

    AxiomInput public input;
    bytes32 public querySchema;
    AxiomPaymaster public paymaster;
    address payable public beneficiaryAddress;

    function setUp() public override {
        BaseTest.setUp();
        beneficiaryAddress = payable(0x1111111111111111111111111111111111111111);

        uint256 maxRefundPerBlock = 21_000;

        _createSelectForkAndSetupAxiom("sepolia", 5_103_063);

        input = AxiomInput({ blockNumber: 4_205_938, addr: address(0x8018fe32fCFd3d166E8b4c4E37105318A84BA11b) });
        querySchema = axiomVm.readCircuit("app/axiom/power-user.circuit.ts");

        paymaster = new AxiomPaymaster(
            IEntryPoint(entryPoint), axiomV2QueryAddress, uint64(block.chainid), querySchema, maxRefundPerBlock
        );
        vm.deal({ account: payable(address(paymaster)), newBalance: 100 ether });
    }

    function test_paymaster_accepts_user_op() public {
        uint128 paymasterPostOpGasLimit = paymaster.REFUND_POST_OP_COST();

        vm.startPrank({ msgSender: users.u1.addr });

        uint256 storedValue = 1;

        bytes memory storeCallData = abi.encodeWithSelector(SimpleProtocol.store.selector, storedValue);
        bytes memory callData =
            abi.encodeWithSelector(SimpleAccount.execute.selector, address(protocol), 0, storeCallData);

        userOp.sender = address(account);
        userOp.paymaster = address(paymaster);
        userOp.paymasterVerificationGasLimit = 3e5;
        userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit;
        userOp.callData = callData;

        userOp = signUserOp(userOp, users.u1, address(entryPoint), block.chainid);

        PackedUserOperation memory opPacked = packUserOp(userOp);
        PackedUserOperation[] memory packedOps = new PackedUserOperation[](1);
        packedOps[0] = opPacked;

        vm.expectEmit(true, true, true, true, address(protocol));
        emit SimpleProtocol.StoreInput(address(account), storedValue);

        entryPoint.handleOps(packedOps, beneficiaryAddress);
    }

    function test_paymaster_rejects_if_postOpGasLimit_too_low() public {
        uint128 paymasterPostOpGasLimit = paymaster.REFUND_POST_OP_COST();

        vm.startPrank({ msgSender: users.u1.addr });

        bytes memory storeCallData = abi.encodeWithSelector(SimpleProtocol.store.selector, 1);
        bytes memory callData = abi.encodeWithSelector(SimpleAccount.execute.selector, 0, storeCallData);

        userOp.sender = address(account);
        userOp.paymaster = address(paymaster);
        userOp.paymasterVerificationGasLimit = 3e5;
        userOp.paymasterPostOpGasLimit = paymasterPostOpGasLimit - 1; // too low
        userOp.callData = callData;

        userOp = signUserOp(userOp, users.u1, address(entryPoint), block.chainid);

        PackedUserOperation memory opPacked = packUserOp(userOp);
        PackedUserOperation[] memory packedOps = new PackedUserOperation[](1);
        packedOps[0] = opPacked;

        vm.expectRevert(
            abi.encodeWithSelector(
                IEntryPoint.FailedOpWithRevert.selector,
                0,
                "AA33 reverted",
                abi.encodePacked(AxiomPaymaster.PostOpGasLimitTooLow.selector)
            )
        );
        entryPoint.handleOps(packedOps, beneficiaryAddress);
    }

    /// @dev Simple demonstration of testing an Axiom client contract using Axiom cheatcodes
    // function test_simple_example() public {
    //     // create a query into Axiom with default parameters
    //     Query memory q = query(querySchema, abi.encode(input), address(averageBalance));

    //     // send the query to Axiom
    //     q.send();

    //     // prank fulfillment of the query, returning the Axiom results
    //     bytes32[] memory results = q.prankFulfill();

    //     // parse Axiom results and verify length is as expected
    //     assertEq(results.length, 3);
    //     uint256 blockNumber = uint256(results[0]);
    //     address addr = address(uint160(uint256(results[1])));
    //     uint256 avg = uint256(results[2]);

    //     // verify the average balance recorded in AverageBalance is as expected
    //     assertEq(avg, averageBalance.provenAverageBalances(blockNumber, addr));
    // }
}
