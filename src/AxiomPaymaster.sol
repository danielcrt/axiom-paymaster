// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.23;

import { BasePaymaster } from "account-abstraction/contracts/core/BasePaymaster.sol";
import { IEntryPoint } from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { PackedUserOperation, UserOperationLib } from "account-abstraction/contracts/core/UserOperationLib.sol";
import "account-abstraction/contracts/core/Helpers.sol" as Helpers;
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { AxiomV2Client } from "@axiom-crypto/v2-periphery/client/AxiomV2Client.sol";
import { IAxiomV2Query } from "@axiom-crypto/v2-periphery/interfaces/query/IAxiomV2Query.sol";
import "forge-std/console.sol";

interface IAxiomV2QueryExtended {
    function queries(uint256 queryId) external returns (IAxiomV2Query.AxiomQueryMetadata memory);
}

contract AxiomPaymaster is BasePaymaster, AxiomV2Client {
    using UserOperationLib for PackedUserOperation;

    /// TODO: find correct value for this
    uint128 public constant REFUND_POST_OP_COST = 1_000_000;

    /// @dev The unique identifier of the circuit accepted by this contract.
    bytes32 immutable QUERY_SCHEMA;

    /// @dev The chain ID of the chain whose data the callback is expected to be called from.
    uint64 immutable SOURCE_CHAIN_ID;

    /// @dev provenGasSpent[address] = Proven gas spent (in wei)
    mapping(address => uint256) public provenGasSpent;
    /// @dev lastProvenBlock[address] = Latest time a user was refunded for
    mapping(address => uint256) public lastProvenBlock;

    mapping(address => uint256) public refundCutoff;

    uint256 public maxRefundPerBlock;

    error PostOpGasLimitTooLow();

    /// @notice Construct a new AverageBalance contract.
    /// @param  _axiomV2QueryAddress The address of the AxiomV2Query contract.
    /// @param  _callbackSourceChainId The ID of the chain the query reads from.
    constructor(
        IEntryPoint _entryPoint,
        address _axiomV2QueryAddress,
        uint64 _callbackSourceChainId,
        bytes32 _querySchema,
        uint256 _maxRefundPerBlock
    ) BasePaymaster(_entryPoint) AxiomV2Client(_axiomV2QueryAddress) {
        QUERY_SCHEMA = _querySchema;
        SOURCE_CHAIN_ID = _callbackSourceChainId;
        maxRefundPerBlock = _maxRefundPerBlock;
    }

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32, /*userOpHash*/
        uint256 /*requiredPreFund*/
    ) internal view override returns (bytes memory context, uint256 validationResult) {
        if (REFUND_POST_OP_COST > userOp.unpackPostOpGasLimit()) {
            revert PostOpGasLimitTooLow();
        }
        context = abi.encode(userOp.sender);
        validationResult = Helpers._packValidationData(false, 0, 0);
    }

    /// @notice Performs post-operation tasks, such as updating the token price and refunding excess tokens.
    /// @dev This function is called after a user operation has been executed or reverted.
    /// @param context The context containing the user sender address.
    /// @param actualGasCost The actual gas cost of the transaction.
    /// @param /*actualUserOpFeePerGas*/ - the gas price this UserOp pays. This value is based on the UserOp's maxFeePerGas
    //      and maxPriorityFee (and basefee)
    //      It is not the same as tx.gasprice, which is what the bundler pays.
    function _postOp(PostOpMode, bytes calldata context, uint256 actualGasCost, uint256 /*actualUserOpFeePerGas*/ )
        internal
        override
    {
        uint256 preGas = gasleft();
        (address payable userOpSender) = abi.decode(context, (address));
        if (actualGasCost < provenGasSpent[userOpSender] && refundCutoff[userOpSender] > block.number) {
            provenGasSpent[userOpSender] -= actualGasCost;
            userOpSender.transfer(actualGasCost);
        }

        console.log("gasleft");
        console.log(gasleft() - preGas);
    }

    /// @inheritdoc AxiomV2Client
    function _validateAxiomV2Call(
        AxiomCallbackType, // callbackType,
        uint64 sourceChainId,
        address, // caller,
        bytes32 querySchema,
        uint256, // queryId,
        bytes calldata // extraData
    ) internal view override {
        // Add your validation logic here for checking the callback responses
        require(sourceChainId == SOURCE_CHAIN_ID, "Source chain ID does not match");
        require(querySchema == QUERY_SCHEMA, "Invalid query schema");
    }

    /// @inheritdoc AxiomV2Client
    function _axiomV2Callback(
        uint64, // sourceChainId,
        address, // caller,
        bytes32, // querySchema,
        uint256 queryId, // queryId,
        bytes32[] calldata axiomResults,
        bytes calldata // extraData
    ) internal override {
        address addr = address(uint160(uint256(axiomResults[0])));
        uint256 blockNumberStart = uint256(axiomResults[1]);
        uint256 blockNumberEnd = uint256(axiomResults[2]);

        require(blockNumberStart > lastProvenBlock[addr]);

        uint256 axiomFee = IAxiomV2QueryExtended(axiomV2QueryAddress).queries(queryId).payment;

        provenGasSpent[addr] += (blockNumberEnd - blockNumberStart) * maxRefundPerBlock + axiomFee;
        refundCutoff[addr] += blockNumberEnd - blockNumberStart;
        lastProvenBlock[addr] = blockNumberEnd;

        // emit GasSpentStored(addr, gasSpent);
    }
}
