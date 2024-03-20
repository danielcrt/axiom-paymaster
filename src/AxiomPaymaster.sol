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
import { IAxiomPaymaster } from "./interfaces/IAxiomPaymaster.sol";

interface IAxiomV2QueryExtended {
    function queries(uint256 queryId) external returns (IAxiomV2Query.AxiomQueryMetadata memory);
}

contract AxiomPaymaster is IAxiomPaymaster, BasePaymaster, AxiomV2Client {
    using UserOperationLib for PackedUserOperation;

    uint128 public constant CALLDATA_ADDRESS_OFFSET = 4;
    uint128 public constant CALLDATA_VALUE_OFFSET = 36;
    /// TODO: find correct value for this
    uint128 public constant REFUND_POST_OP_COST = 21_000;

    /// @dev The unique identifier of the circuit accepted by this contract.
    bytes32 immutable QUERY_SCHEMA;

    /// @dev The chain ID of the chain whose data the callback is expected to be called from.
    uint64 immutable SOURCE_CHAIN_ID;

    /// @notice Max amount of ETH protocol offers as gas refund per block
    uint256 public maxRefundPerBlock;

    /// @notice Mapping holding user allowances
    mapping(address user => mapping(address protocol => UserAllowance allowance)) public allowances;

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

    /// @inheritdoc BasePaymaster
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32, /*userOpHash*/
        uint256 /*requiredPreFund*/
    ) internal view override returns (bytes memory context, uint256 validationResult) {
        if (REFUND_POST_OP_COST > userOp.unpackPostOpGasLimit()) {
            revert PostOpGasLimitTooLow();
        }

        (address protocolAddress) =
            abi.decode(userOp.callData[CALLDATA_ADDRESS_OFFSET:CALLDATA_VALUE_OFFSET], (address));

        uint256 maxGasCost = userOp.gasPrice() * userOp.unpackCallGasLimit();
        UserAllowance memory allowance = allowances[userOp.sender][protocolAddress];

        if (maxGasCost > allowance.refundValue || allowance.refundCutoff < block.number) {
            revert NotEligible();
        }

        context = abi.encode(userOp.sender, protocolAddress);

        validationResult = Helpers._packValidationData(false, 0, 0);
    }

    /// @notice Performs post-operation tasks, such as updating the remaining refund
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
        (address payable userOpSender, address protocolAddress) = abi.decode(context, (address, address));

        allowances[userOpSender][protocolAddress].refundValue -= uint160(actualGasCost);
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
        address protocolAddress = address(uint160(uint256(axiomResults[1])));
        uint48 blockNumberStart = uint48(uint256(axiomResults[2]));
        uint48 blockNumberEnd = uint48(uint256(axiomResults[3]));
        UserAllowance memory allowance = allowances[addr][protocolAddress];

        if (blockNumberStart <= allowance.lastProvenBlock) {
            revert AlreadyProven();
        }

        uint256 axiomFee = IAxiomV2QueryExtended(axiomV2QueryAddress).queries(queryId).payment;
        // Determine the max refund amount for proven period.
        // This includes the Axiom query fee
        uint256 newRefund = (blockNumberEnd - blockNumberStart) * maxRefundPerBlock + axiomFee;

        require(newRefund < type(uint160).max);
        allowances[addr][protocolAddress].refundValue = uint160(newRefund);

        uint48 newCutoff = uint48(block.number) + blockNumberEnd - blockNumberStart;
        if (newCutoff > allowance.refundCutoff) {
            allowances[addr][protocolAddress].refundCutoff = newCutoff;
        }

        allowances[addr][protocolAddress].lastProvenBlock = blockNumberEnd;

        emit UsageProved(addr, protocolAddress, newRefund);
    }

    function getAllowance(address user, address protocolAddress) public view returns (UserAllowance memory) {
        return allowances[user][protocolAddress];
    }
}
