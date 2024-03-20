"use client";

import { useAxiomCircuit } from "@axiom-crypto/react";
import { UserInput } from "@axiom-crypto/client";
import jsonInputs from "../../../axiom/data/inputs.json";
import { useEffect, useRef } from "react";
import LoadingAnimation from "../ui/LoadingAnimation";
import SubmitQuery from "./SubmitQuery";

export default function BuildQuery({
  inputs,
  callbackTarget,
  callbackExtraData,
  refundee,
  callbackAbi
}: {
  inputs: UserInput<typeof jsonInputs>;
  callbackTarget: string;
  callbackExtraData: string;
  refundee: string;
  callbackAbi: any[];
}) {
  const hasSetParams = useRef(false);
  const hasBuiltQuery = useRef(false);
  const {
    build,
    builtQuery,
    setParams,
    areParamsSet
  } = useAxiomCircuit<typeof jsonInputs>();

  useEffect(() => {
    if (hasSetParams.current) return;
    if (!inputs) return;
    hasSetParams.current = true;
    setParams(inputs, callbackTarget, callbackExtraData, refundee);
  }, [setParams, inputs, callbackTarget, callbackExtraData, refundee]);

  useEffect(() => {
    const buildQuery = async () => {
      if (!areParamsSet) {
        return;
      }
      if (hasBuiltQuery.current) return;
      hasBuiltQuery.current = true;
      await build();
    };
    buildQuery();
  }, [build, areParamsSet]);

  if (!builtQuery) {
    return (
      <div className="flex flex-row items-center gap-2">
        {"Building Query"} <LoadingAnimation />
      </div>
    );
  }

  return <SubmitQuery callbackAbi={callbackAbi} />;
}
