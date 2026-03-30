// IPFS configuration
import { ENV } from './env'

export const IPFS_CONFIG = {
  apiKey: ENV.ipfsApiKey,
  apiSecret: ENV.ipfsApiSecret,
  pinataApiUrl: 'https://api.pinata.cloud',
  pinataGateway: 'https://gateway.pinata.cloud/ipfs',
}
