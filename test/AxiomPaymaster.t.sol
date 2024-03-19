// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@axiom-crypto/axiom-std/AxiomTest.sol";

import { PackedUserOperation } from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import { IEntryPoint } from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { AxiomPaymaster, IAxiomV2QueryExtended } from "../src/AxiomPaymaster.sol";
import { EntryPoint } from "account-abstraction/contracts/core/EntryPoint.sol";
import { SimpleProtocol } from "../src/SimpleProtocol.sol";
import { BaseTest } from "./Base.t.sol";
import { TestHelpers } from "./TestHelpers.sol";
import { SimpleAccount } from "account-abstraction/contracts/samples/SimpleAccount.sol";

contract AxiomPaymasterTest is AxiomTest, BaseTest {
    using Axiom for Query;

    uint256 public constant MAX_INPUT_LENGTH = 52;

    struct AxiomInput {
        uint64[] blockNumbers;
        uint64[] txIdxs;
        uint64[] logIdxs;
        address addr;
        address contractAddress;
    }

    AxiomInput public input;
    bytes32 public querySchema;
    AxiomPaymaster public paymaster;
    address payable public beneficiaryAddress;
    uint256 public constant MAX_REFUND_PER_BLOCK = 10_000 gwei;

    function setUp() public override {
        _createSelectForkAndSetupAxiom("sepolia", 5_515_749);
        BaseTest.setUp();

        uint64[] memory blockNumbers = new uint64[](MAX_INPUT_LENGTH);
        uint64[] memory txIdxs = new uint64[](MAX_INPUT_LENGTH);
        uint64[] memory logIdxs = new uint64[](MAX_INPUT_LENGTH);
        blockNumbers[0] = 5_515_664;
        txIdxs[0] = 29;
        logIdxs[0] = 0;

        for (uint256 i = 1; i < MAX_INPUT_LENGTH; i++) {
            blockNumbers[i] = 5_515_748;
            txIdxs[i] = 59;
            logIdxs[i] = 0;
        }

        input = AxiomInput({
            blockNumbers: blockNumbers,
            txIdxs: txIdxs,
            logIdxs: logIdxs,
            // https://sepolia.etherscan.io/address/0xFe7534363900492Fe14388F5779A3F772d5F42Eb
            addr: address(validAccount),
            // https://sepolia.etherscan.io/address/0x8A6cF8A2F64da5b7Dcd9FC3FcF71Cce8fB2B3d7e
            contractAddress: address(0x8A6cF8A2F64da5b7Dcd9FC3FcF71Cce8fB2B3d7e)
        });

        beneficiaryAddress = payable(0x1111111111111111111111111111111111111111);

        querySchema = axiomVm.readCircuit("app/axiom/power-user.circuit.ts");

        paymaster = new AxiomPaymaster(
            entryPoint, axiomV2QueryAddress, uint64(block.chainid), querySchema, MAX_REFUND_PER_BLOCK
        );

        // Fund entry point for paymaster
        entryPoint.depositTo{ value: 10 ether }(address(paymaster));
    }

    function test_paymaster_rejects_not_proven_user_op() public {
        vm.startPrank({ msgSender: users.relayer.addr });

        uint256 storedValue = 1;

        bytes memory storeCallData = abi.encodeWithSelector(SimpleProtocol.store.selector, storedValue);
        bytes memory callData =
            abi.encodeWithSelector(SimpleAccount.execute.selector, address(protocol), 0, storeCallData);

        userOp.nonce = account.getNonce();
        userOp.sender = address(account);
        userOp.paymaster = address(paymaster);
        userOp.paymasterVerificationGasLimit = 3e5;
        userOp.paymasterPostOpGasLimit = paymaster.REFUND_POST_OP_COST();
        userOp.callData = callData;

        userOp = signUserOp(userOp, users.u1, address(entryPoint), block.chainid);

        PackedUserOperation memory opPacked = packUserOp(userOp);
        PackedUserOperation[] memory packedOps = new PackedUserOperation[](1);
        packedOps[0] = opPacked;

        // bytes32 userOpHash = getUserOpHash(userOp, address(entryPoint), block.chainid);
        // // User has not submitted a proof so post op should revert
        // vm.expectEmit(true, true, true, true, address(entryPoint));
        // emit IEntryPoint.PostOpRevertReason(
        //     userOpHash,
        //     userOp.sender,
        //     userOp.nonce,
        //     abi.encodeWithSelector(
        //         IEntryPoint.PostOpReverted.selector, abi.encodePacked(AxiomPaymaster.NotEligible.selector)
        //     )
        // );

        vm.expectRevert(
            abi.encodeWithSelector(
                IEntryPoint.FailedOpWithRevert.selector,
                0,
                "AA33 reverted",
                abi.encodePacked(AxiomPaymaster.NotEligible.selector)
            )
        );

        entryPoint.handleOps(packedOps, beneficiaryAddress);
    }

    function test_paymaster_rejects_if_postOpGasLimit_too_low() public {
        vm.startPrank({ msgSender: users.relayer.addr });

        uint128 paymasterPostOpGasLimit = paymaster.REFUND_POST_OP_COST();

        bytes memory storeCallData = abi.encodeWithSelector(SimpleProtocol.store.selector, 1);
        bytes memory callData =
            abi.encodeWithSelector(SimpleAccount.execute.selector, address(protocol), 0, storeCallData);

        userOp.nonce = account.getNonce();
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

    function test_proof_updates_state() public {
        // uint256 axiomFee = 0.001 ether;
        uint256 axiomFee = 0;

        // create a query into Axiom with default parameters
        IAxiomV2Query.AxiomV2FeeData memory feeData = IAxiomV2Query.AxiomV2FeeData({
            maxFeePerGas: 25 gwei,
            callbackGasLimit: 1_000_000,
            overrideAxiomQueryFee: axiomFee
        });

        Query memory q = query(querySchema, abi.encode(input), address(paymaster), "", feeData, msg.sender);

        // send the query to Axiom
        q.send();

        // prank fulfillment of the query, returning the Axiom results
        bytes32[] memory results = q.prankFulfill();

        uint256 fulfillBlockNumber = block.number;

        // parse Axiom results and verify length is as expected
        assertEq(results.length, 4);
        address addr = address(uint160(uint256(results[0])));
        address protocolAddress = address(uint160(uint256(results[1])));
        uint256 blockNumberStart = uint256(results[2]);
        uint256 blockNumberEnd = uint256(results[3]);

        assertEq(addr, address(validAccount));
        assertEq(protocolAddress, address(protocol));

        // verify the refund cutoff is calculated as expected in Paymaster
        assertEq(fulfillBlockNumber + blockNumberEnd - blockNumberStart, paymaster.refundCutoff(addr, protocolAddress));
        assertEq(blockNumberEnd, paymaster.lastProvenBlock(addr, protocolAddress));

        // uint256 axiomFeez = IAxiomV2QueryExtended(axiomV2QueryAddress).queries(QUERY_ID).payment;

        uint256 newRefund = (blockNumberEnd - blockNumberStart) * MAX_REFUND_PER_BLOCK + axiomFee;

        assertEq(newRefund, paymaster.refundValue(addr, protocolAddress));

        // Verify if user is refunded now
        // Transfer ownership to an account that we can use to sign further txns
        vm.startPrank({ msgSender: validAccount.owner() });
        validAccount.transferOwnership(users.u1.addr);

        uint256 storedValue = 2;
        bytes memory storeCallData = abi.encodeWithSelector(SimpleProtocol.store.selector, storedValue);
        bytes memory callData =
            abi.encodeWithSelector(SimpleAccount.execute.selector, address(protocol), 0, storeCallData);

        userOp.nonce = validAccount.getNonce();
        userOp.sender = address(validAccount);
        userOp.paymaster = address(paymaster);
        userOp.paymasterVerificationGasLimit = 3e5;
        userOp.paymasterPostOpGasLimit = paymaster.REFUND_POST_OP_COST();
        userOp.callData = callData;

        userOp = signUserOp(userOp, users.u1, address(entryPoint), block.chainid);

        PackedUserOperation memory opPacked = packUserOp(userOp);
        PackedUserOperation[] memory packedOps = new PackedUserOperation[](1);
        packedOps[0] = opPacked;

        uint256 refundValueBefore = paymaster.refundValue(addr, protocolAddress);

        vm.startPrank({ msgSender: users.relayer.addr });

        vm.expectEmit(true, true, true, true, address(protocol));
        emit SimpleProtocol.StoreInput(address(validAccount), storedValue);

        entryPoint.handleOps(packedOps, beneficiaryAddress);
        uint256 refundValueAfter = paymaster.refundValue(addr, protocolAddress);

        assertLt(refundValueAfter, refundValueBefore);
    }
}
