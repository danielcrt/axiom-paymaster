// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import { PackedUserOperation } from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { User, UserOperation } from "./Types.sol";
import { Test } from "forge-std/Test.sol";

contract TestHelpers is Test {
    function bytesToBytes32(bytes memory data) public pure returns (bytes32 result) {
        require(data.length >= 32, "Input data must be at least 32 bytes");
        assembly {
            result := mload(add(data, 32))
        }
    }

    function packAccountGasLimits(uint256 verificationGasLimit, uint256 callGasLimit) public pure returns (bytes32) {
        bytes memory verificationGasLimitBytes = abi.encodePacked(uint128(verificationGasLimit));
        bytes memory callGasLimitBytes = abi.encodePacked(uint128(callGasLimit));

        return bytesToBytes32(abi.encodePacked(verificationGasLimitBytes, callGasLimitBytes));
    }

    function packPaymasterData(
        address paymaster,
        uint256 paymasterVerificationGasLimit,
        uint256 postOpGasLimit,
        bytes memory paymasterData
    ) public pure returns (bytes memory) {
        bytes memory paymasterBytes = abi.encodePacked(paymaster);
        bytes memory paymasterVerificationGasLimitBytes = abi.encodePacked(uint128(paymasterVerificationGasLimit));
        bytes memory postOpGasLimitBytes = abi.encodePacked(uint128(postOpGasLimit));

        return abi.encodePacked(paymasterBytes, paymasterVerificationGasLimitBytes, postOpGasLimitBytes, paymasterData);
    }

    function encodeUserOp(UserOperation memory userOp, bool forSignature) public pure returns (bytes memory) {
        PackedUserOperation memory packedUserOp = packUserOp(userOp);
        if (forSignature) {
            return abi.encode(
                packedUserOp.sender,
                packedUserOp.nonce,
                keccak256(packedUserOp.initCode),
                keccak256(packedUserOp.callData),
                packedUserOp.accountGasLimits,
                packedUserOp.preVerificationGas,
                packedUserOp.gasFees,
                keccak256(packedUserOp.paymasterAndData)
            );
        } else {
            return abi.encode(
                packedUserOp.sender,
                packedUserOp.nonce,
                packedUserOp.initCode,
                packedUserOp.callData,
                packedUserOp.accountGasLimits,
                packedUserOp.preVerificationGas,
                packedUserOp.gasFees,
                packedUserOp.paymasterAndData,
                packedUserOp.signature
            );
        }
    }

    function getUserOpHash(UserOperation memory op, address entryPoint, uint256 chainId)
        public
        pure
        returns (bytes32)
    {
        bytes32 userOpHash = keccak256(encodeUserOp(op, true));
        return keccak256(abi.encode(userOpHash, entryPoint, chainId));
    }

    function signUserOp(UserOperation memory op, User memory signer, address entryPoint, uint256 chainId)
        public
        pure
        returns (UserOperation memory)
    {
        bytes32 message = MessageHashUtils.toEthSignedMessageHash(getUserOpHash(op, entryPoint, chainId));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signer.pk, message);
        bytes memory signature = abi.encodePacked(r, s, v);

        op.signature = signature;
        return op;
    }

    function packUserOp(UserOperation memory userOp) public pure returns (PackedUserOperation memory) {
        bytes32 accountGasLimits = packAccountGasLimits(userOp.verificationGasLimit, userOp.callGasLimit);
        bytes32 gasFees = packAccountGasLimits(userOp.maxPriorityFeePerGas, userOp.maxFeePerGas);
        bytes memory paymasterAndData = bytes("");

        if (userOp.paymaster != address(0)) {
            paymasterAndData = packPaymasterData(
                userOp.paymaster,
                userOp.paymasterVerificationGasLimit,
                userOp.paymasterPostOpGasLimit,
                userOp.paymasterData
            );
        }

        return PackedUserOperation({
            sender: userOp.sender,
            nonce: userOp.nonce,
            callData: userOp.callData,
            accountGasLimits: accountGasLimits,
            initCode: userOp.initCode,
            preVerificationGas: userOp.preVerificationGas,
            gasFees: gasFees,
            paymasterAndData: paymasterAndData,
            signature: userOp.signature
        });
    }
}
