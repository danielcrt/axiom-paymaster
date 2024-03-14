import {
  sub,
  addToCallback,
  CircuitValue,
  CircuitValue256,
  getReceipt,
  checkEqual,
  isEqual,
  constant,
  or,
  isZero,
  isLessThan,
  select,
} from "@axiom-crypto/client";

// blockNumbers are expected to be ascending ordered (from oldest to latest)
export interface CircuitInputs {
  blockNumbers: CircuitValue[];
  txIds: CircuitValue[];
  logIdxs: CircuitValue[];
  address: CircuitValue;
  contractAddress: CircuitValue;
}

// Default inputs to use for compiling the circuit. These values should be different than the inputs fed into
// the circuit at proving time.
// Tx1: https://sepolia.etherscan.io/tx/0xd948b42d82a9e79dee7b11b984d4fd6c85605b6cb07361b77e1920f56e720cbb
export const defaultInputs = {
  // prettier-ignore
  blockNumbers: [5483082, 5483103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // prettier-ignore
  txIds: [35, 44, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // prettier-ignore
  logIdxs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // https://sepolia.etherscan.io/address/0xa85A7a0C89b41C147ab1ea55e799ECeb11fE0674
  address: "0x8a6cf8a2f64da5b7dcd9fc3fcf71cce8fb2b3d7e",
  // https://sepolia.etherscan.io/address/0x8A6cF8A2F64da5b7Dcd9FC3FcF71Cce8fB2B3d7e
  contractAddress: "0x8a6cf8a2f64da5b7dcd9fc3fcf71cce8fb2b3d7e",
};

// The function name `circuit` is searched for by default by our Axiom CLI; if you decide to
// change the function name, you'll also need to ensure that you also pass the Axiom CLI flag
// `-f <circuitFunctionName>` for it to work
export const circuit = async (inputs: CircuitInputs) => {
  // Assumes one block is mined every ~12 seconds
  const oneWeekInBlocks = (7 * 24 * 3600) / 12;

  // 52 weeks in a year
  const maxSamples = 52;

  if (
    inputs.blockNumbers.length !== maxSamples ||
    inputs.txIds.length !== maxSamples ||
    inputs.logIdxs.length !== maxSamples
  ) {
    throw new Error(
      "All input arrays must have the max sample length. Fill unused values with 0."
    );
  }

  let lastBlockNumber = inputs.blockNumbers[0];

  for (let i = 1; i < maxSamples; i++) {
    const hasReachedInputEnd = isLessThan(constant(0), inputs.blockNumbers[i]);

    // Check the block numbers are in order
    checkEqual(
      constant(1),
      or(
        isZero(hasReachedInputEnd),
        isLessThan(inputs.blockNumbers[i - 1], inputs.blockNumbers[i])
      )
    );
    // Check that the distance between 2 interactions is less than 1 week
    checkEqual(
      constant(1),
      or(
        isZero(hasReachedInputEnd),
        isLessThan(
          sub(inputs.blockNumbers[i], inputs.blockNumbers[i - 1]),
          oneWeekInBlocks
        )
      )
    );

    const receipt = getReceipt(inputs.blockNumbers[i], inputs.txIds[i]);
    const log = receipt.log(inputs.logIdxs[i]);
    const topic: CircuitValue256 = await log.topic(
      1,
      // event StoreInput(address indexed caller, uint256 value)
      "0x43922a39f958ab664e689548bf78b1b6183f86b63685c7bbe03b1b73dd359041"
    );

    const contractAddress = await log.address();

    checkEqual(
      constant(1),
      or(
        isZero(hasReachedInputEnd),
        isEqual(contractAddress.toCircuitValue(), inputs.contractAddress)
      )
    );
    checkEqual(
      constant(1),
      or(
        isZero(hasReachedInputEnd),
        isEqual(inputs.address, topic.toCircuitValue())
      )
    );

    lastBlockNumber = select(
      hasReachedInputEnd,
      inputs.blockNumbers[i],
      lastBlockNumber
    );
  }

  if (lastBlockNumber === inputs.blockNumbers[0]) {
    throw new Error("Nothing to prove here.");
  }

  addToCallback(inputs.address);
  addToCallback(inputs.contractAddress);
  addToCallback(inputs.blockNumbers[0]);
  addToCallback(lastBlockNumber);
};
