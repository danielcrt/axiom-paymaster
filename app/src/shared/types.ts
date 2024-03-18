import { BigNumberish } from "ethers";

export type UserOperation = {
  sender: string;
  nonce: BigNumberish;
  initCode: string;
  callData: string;
  callGasLimit: BigNumberish;
  verificationGasLimit: BigNumberish;
  preVerificationGas: BigNumberish;
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
  paymaster: string;
  paymasterVerificationGasLimit: BigNumberish;
  paymasterPostOpGasLimit: BigNumberish;
  paymasterData: string;
  signature: string;
};

export type PackedUserOperation = {
  sender: string;
  nonce: BigNumberish;
  initCode: string;
  callData: string;
  accountGasLimits: string;
  preVerificationGas: BigNumberish;
  gasFees: string;
  paymasterAndData: string;
  signature: string;
};
