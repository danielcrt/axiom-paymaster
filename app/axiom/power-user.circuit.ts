import {
  add,
  sub,
  mul,
  div,
  checkLessThan,
  addToCallback,
  CircuitValue,
  CircuitValue256,
  constant,
  getAccount,
  getReceipt,
  checkEqual,
  getTx,
} from "@axiom-crypto/client";

// blockNumbers are expected to be ascending ordered (from oldest to latest)
export interface CircuitInputs {
  blockNumbers: CircuitValue[];
  txIds: CircuitValue[];
  logIdxs: CircuitValue[];
  topicIdxs: CircuitValue[];
  address: CircuitValue;
}

// Default inputs to use for compiling the circuit. These values should be different than the inputs fed into
// the circuit at proving time.
export const defaultInputs = {
  blockNumber: 4000000,
  address: "0xEaa455e4291742eC362Bc21a8C46E5F2b5ed4701",
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
    inputs.logIdxs.length !== maxSamples ||
    inputs.topicIdxs.length !== maxSamples
  ) {
    throw new Error(
      "All input arrays must have the max sample length. Fill unused values with 0."
    );
  }

  const lastBlockNumber = inputs.blockNumbers[0];
  const protocolAddress = "0x";

  for (let i = 1; i < maxSamples; i++) {
    if (inputs.blockNumbers[i] === 0) {
      break;
    }

    const receipt = getReceipt(inputs.blockNumbers[i], inputs.txIds[i]);

    const log = receipt.log(inputs.logIdxs[i]);
    const topic: CircuitValue256 = await log.topic(
      inputs.topicIdxs[i],
      "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c"
    );

    const contractAddress = await log.address();
    checkEqual(contractAddress.toCircuitValue(), protocolAddress);
    checkEqual(inputs.address, topic.toCircuitValue());
  }

  if (lastBlockNumber === inputs.blockNumbers[0]) {
    throw new Error("Nothing to prove here.");
  }

  addToCallback(inputs.address);
  addToCallback(inputs.blockNumbers[0]);
  addToCallback(lastBlockNumber);
};

// function hasInteractedWeekly() {
//   const dates = [
//     new Date("2024-03-01"),
//     new Date("2024-03-08"),
//     new Date("2024-03-15"),
//     new Date("2024-03-22"),
//     new Date("2024-03-29"),
//     new Date("2024-04-05"),
//     new Date("2024-04-12"),
//     new Date("2024-04-19"),
//     new Date("2024-04-26"),
//     new Date("2024-05-03"),
//     new Date("2024-05-10"),
//     new Date("2024-05-17"),
//   ];

//   // User needs to interact with protocol no later than 8 days after his last interaction in order to keep the streak
//   const weekInMs = 1000 * 3600 * 24 * 7;

//   for (let i = 1; i < 12; i++) {
//     if (dates[i].getTime() > dates[i - 1].getTime() && dates[i].getTime() - dates[i - 1].getTime() > weekInMs) {
//       return false;
//     }
//   }
//   return true;
// }
// hasInteractedWeekly();
