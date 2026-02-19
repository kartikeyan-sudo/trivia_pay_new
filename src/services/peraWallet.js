/**
 * Single shared PeraWalletConnect instance.
 */
import { PeraWalletConnect } from '@perawallet/connect'

const peraWallet = new PeraWalletConnect({
  shouldShowSignTxnToast: true,
})

export default peraWallet
