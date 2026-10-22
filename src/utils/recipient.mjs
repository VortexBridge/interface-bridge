import { ethers } from "ethers";

// UI feedback for Vortex's destination chains. Contract/flow preflights still run before signing.
export function recipientError(value, chainType, bridgeAddress) {
  if (!value) return "";
  const U = ethers.utils;
  try {
    if (chainType === "evm") {
      if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error();
      const address = U.getAddress(value);
      if (address === ethers.constants.AddressZero || address.toLowerCase() === String(bridgeAddress).toLowerCase())
        return "The zero address and the receiving bridge cannot receive this transfer.";
      return "";
    }
    if (chainType === "koinos") {
      const bytes = U.arrayify(U.base58.decode(value));
      if (bytes.length !== 25 || bytes[0] !== 0 || bytes.slice(1, 21).every(byte => byte === 0)) throw new Error();
      const checksum = U.arrayify(U.sha256(U.sha256(bytes.slice(0, 21))));
      if (!bytes.slice(21).every((byte, index) => byte === checksum[index])) throw new Error();
      if (value === bridgeAddress) return "The receiving bridge cannot receive this transfer.";
      return "";
    }
  } catch {
    return chainType === "evm" ? "Enter a valid Ethereum address with a valid checksum." : "Enter a valid Koinos address with a valid checksum.";
  }
  return "Select a receiving network.";
}
