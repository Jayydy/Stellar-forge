import { Keypair } from 'stellar-sdk';

/**
 * Funds an account on the Stellar testnet using the public Friendbot.
 */
export async function fundAccount(address: string) {
  const friendbotUrl = 'https://friendbot.stellar.org';
  const response = await fetch(`${friendbotUrl}?addr=${address}`);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fund account ${address}: ${response.statusText} - ${errorBody}`);
  }
}

/**
 * Generates a new random Keypair for testing.
 */
export function generateTestAccount() {
  return Keypair.random();
}
