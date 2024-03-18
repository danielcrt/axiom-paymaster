import { PackedUserOperation, UserOperation } from "@/shared/types";
import { BigNumberish, AbiCoder, keccak256, ZeroAddress, ethers, toBeHex, zeroPadValue } from "ethers";

const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;

export const shortenAddress = (address: string) => {
  const match = address.match(truncateRegex);
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};

export const numberToHex = (num: number) => {
  return `0x${num.toString(16)}`;
};

export const classes = (...classNames: (string | undefined | boolean)[]) =>
  classNames.filter((c) => !!c).join(" ");

export const forwardSearchParams = (searchParams: {
  [key: string]: string | string[] | undefined;
}): string => {
  // searchParams { address: '0xB392448932F6ef430555631f765Df0dfaE34efF3' }
  // -> "address=0xB392448932F6ef430555631f765Df0dfaE34efF3"
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, Array.isArray(value) ? value.join(",") : value);
    }
  });
  return params.toString();
};

export const convertToBytes32 = (inputArray: Uint8Array): string[] => {
  let result: string[] = [];
  for (let i = 0; i < inputArray.length; i += 32) {
    let slice = inputArray.slice(i, i + 32);
    let hex =
      "0x" +
      Buffer.from(slice)
        .toString("hex")
        .padStart(64, "0");
    result.push(hex);
  }
  return result;
};

export const convertToBytes = (inputArray: Uint8Array): string => {
  let hex = Buffer.from(inputArray).toString("hex");
  return hex;
};

export const bytes32 = (input: string): string => {
  const val = BigInt(input);
  return (
    "0x" +
    val
      .toString(16)
      .padStart(64, "0")
      .toLowerCase()
  );
};

export const isContract = (bytecode?: string): boolean => {
  if (!bytecode) return false;
  return bytecode.length > 2;
};

export const shortenString = (text: string, maxChars: number = 12): string => {
  return text.length > maxChars ? text.substring(0, maxChars) + "..." : text;
};


export const packUserOp = (userOp: UserOperation): PackedUserOperation => {
  const accountGasLimits = packAccountGasLimits(userOp.verificationGasLimit, userOp.callGasLimit)
  const gasFees = packAccountGasLimits(userOp.maxPriorityFeePerGas, userOp.maxFeePerGas)
  let paymasterAndData = '0x'
  if (userOp.paymaster?.length >= 20 && userOp.paymaster !== ZeroAddress) {
    paymasterAndData = packPaymasterData(userOp.paymaster as string, userOp.paymasterVerificationGasLimit, userOp.paymasterPostOpGasLimit, userOp.paymasterData as string)
  }
  return {
    sender: userOp.sender,
    nonce: userOp.nonce,
    callData: userOp.callData,
    accountGasLimits,
    initCode: userOp.initCode,
    preVerificationGas: userOp.preVerificationGas,
    gasFees,
    paymasterAndData,
    signature: userOp.signature
  }
}

export const packAccountGasLimits = (verificationGasLimit: BigNumberish, callGasLimit: BigNumberish): string => {
  return ethers.concat([
    zeroPadValue(toBeHex(verificationGasLimit), 16), zeroPadValue(toBeHex(callGasLimit), 16)
  ])
}

export const packPaymasterData = (paymaster: string, paymasterVerificationGasLimit: BigNumberish, postOpGasLimit: BigNumberish, paymasterData: string): string =>{
  return ethers.concat([
    paymaster, zeroPadValue(toBeHex(paymasterVerificationGasLimit ), 16),
    zeroPadValue(toBeHex(postOpGasLimit), 16), paymasterData
  ])
}

export function encodeUserOp(
  userOp: UserOperation,
  forSignature = true
): string {
  const packedUserOp = packUserOp(userOp);
  if (forSignature) {
    return AbiCoder.defaultAbiCoder().encode(
      [
        "address",
        "uint256",
        "bytes32",
        "bytes32",
        "bytes32",
        "uint256",
        "bytes32",
        "bytes32",
      ],
      [
        packedUserOp.sender,
        packedUserOp.nonce,
        keccak256(packedUserOp.initCode),
        keccak256(packedUserOp.callData),
        packedUserOp.accountGasLimits,
        packedUserOp.preVerificationGas,
        packedUserOp.gasFees,
        keccak256(packedUserOp.paymasterAndData),
      ]
    );
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return AbiCoder.defaultAbiCoder().encode(
      [
        "address",
        "uint256",
        "bytes",
        "bytes",
        "bytes32",
        "uint256",
        "bytes32",
        "bytes",
        "bytes",
      ],
      [
        packedUserOp.sender,
        packedUserOp.nonce,
        packedUserOp.initCode,
        packedUserOp.callData,
        packedUserOp.accountGasLimits,
        packedUserOp.preVerificationGas,
        packedUserOp.gasFees,
        packedUserOp.paymasterAndData,
        packedUserOp.signature,
      ]
    );
  }
}

export function getUserOpHash(
  op: UserOperation,
  entryPoint: string,
  chainId: number
): string {
  const userOpHash = keccak256(encodeUserOp(op, true));
  const enc = AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "address", "uint256"],
    [userOpHash, entryPoint, chainId]
  );
  return keccak256(enc);
}