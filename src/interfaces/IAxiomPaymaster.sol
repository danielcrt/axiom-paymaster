// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.23;

/// @title The interface for AxiomPaymaster smart contract
interface IAxiomPaymaster {
    struct UserAllowance {
        /// @notice The maximum amount of gas a user can be refunded before cutoff
        uint160 refundValue;
        /// @notice The last block that user has included in a proof
        uint48 lastProvenBlock;
        /// @notice The last block the user's transactions can be refunded
        uint48 refundCutoff;
    }

    /// @param user Address of the user for which the proof was submitted
    /// @param protocol The address of the protocol's contract that user interacted with
    /// @param refundValue The amount of gas that the user is eligible for the submitted proof
    event UsageProved(address indexed user, address indexed protocol, uint256 refundValue);

    /// @notice Thrown when gas limit set for the post operation is too low
    error PostOpGasLimitTooLow();

    /// @notice Thrown when user is not eligible for gas refund
    error NotEligible();

    /// @notice Thrown when user tries to prove something older than his last claim
    error AlreadyProven();

    /// @notice Get the allowance of a user for a specific protocol
    /// @param user Address for which to retrieve the allowance
    /// @param protocolAddress Protocol for which the allowance is approved
    function getAllowance(address user, address protocolAddress) external view returns (UserAllowance memory);
}
