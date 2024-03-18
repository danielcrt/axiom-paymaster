import { ZeroAddress } from "ethers";
import { UserOperation } from "./types";

export const Constants = Object.freeze({
  ETHERSCAN_BASE_URL: "https://sepolia.etherscan.io/",
  EXPLORER_BASE_URL: "https://explorer.axiom.xyz/v2/sepolia",
  CALLBACK_CONTRACT: "0x50F2D5c9a4A35cb922a631019287881f56A00ED5",
  EXAMPLE_CLIENT_ADDRESS: "0x4A4e2D8f3fBb3525aD61db7Fc843c9bf097c362e",
  CHAIN_ID_SEPOLIA: 11155111,
  // https://sepolia.etherscan.io/address/0x7694f355fBca907e87FeB88a584363465dc66D8A#code
  ENTRY_POINT_ADDRESS: "0x7694f355fBca907e87FeB88a584363465dc66D8A",
  ACCOUNT_FACTORY_ADDRESS: "0xd0696B8127FEB08A595e31194dB08D3ee78158fF",
  PROTOCOL_ADDRESS: "0x8a6cf8a2f64da5b7dcd9fc3fcf71cce8fb2b3d7e",
  BENEFICIARY_ADDRESS: "0x1111111111111111111111111111111111111111",
  PAYMASTER_ADDRESS: "",
});

export const DEFAULT_USER_OP: UserOperation = {
  sender: ZeroAddress,
  nonce: 0,
  initCode: "0x",
  callData: "0x",
  callGasLimit: 150_000,
  verificationGasLimit: 150_000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
  preVerificationGas: 21_000, // should also cover calldata cost.
  maxFeePerGas: 0,
  maxPriorityFeePerGas: 1e9,
  paymaster: ZeroAddress,
  paymasterData: "0x",
  paymasterVerificationGasLimit: 3e5,
  paymasterPostOpGasLimit: 0,
  signature: "0x",
};
