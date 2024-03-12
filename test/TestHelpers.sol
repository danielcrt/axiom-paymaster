// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import { PackedUserOperation } from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";

contract TestHelpers {
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint128 callGasLimit;
        uint128 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        address paymaster;
        uint128 paymasterVerificationGasLimit;
        uint128 paymasterPostOpGasLimit;
        bytes paymasterData;
        bytes signature;
    }

    UserOperation defaultsForUserOp = UserOperation({
        sender: address(0),
        nonce: 0,
        initCode: "0x",
        callData: "0x",
        callGasLimit: 0,
        verificationGasLimit: 150_000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
        preVerificationGas: 21_000, // should also cover calldata cost.
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 1e9,
        paymaster: address(0),
        paymasterData: "0x",
        paymasterVerificationGasLimit: 3e5,
        paymasterPostOpGasLimit: 0,
        signature: "0x"
    });

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
        bytes memory packedUserOp = packUserOp(userOp);
        if (forSignature) {
            return abi.encode(
                userOp.sender,
                userOp.nonce,
                keccak256(packedUserOp),
                keccak256(packedUserOp),
                userOp.accountGasLimits,
                userOp.preVerificationGas,
                userOp.gasFees,
                keccak256(userOp.paymasterAndData)
            );
        } else {
            return abi.encode(
                userOp.sender,
                userOp.nonce,
                packedUserOp,
                packedUserOp,
                userOp.accountGasLimits,
                userOp.preVerificationGas,
                userOp.gasFees,
                userOp.paymasterAndData,
                userOp.signature
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

    function signUserOp(UserOperation memory op, User signer, address entryPoint, uint256 chainId)
        public
        returns (UserOperation memory)
    {
        bytes32 message = getUserOpHash(op, entryPoint, chainId);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(users.participantA.pk, message);
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
