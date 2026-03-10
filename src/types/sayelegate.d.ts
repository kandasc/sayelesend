// SayeleGate Payment SDK global type declarations
interface SayeleGateSDKInstance {
  redirectToCheckout(options: {
    clientSecret: string;
    successUrl?: string;
    cancelUrl?: string;
  }): void;
}

interface SayeleGateSDKConstructor {
  new (publicKey: string): SayeleGateSDKInstance;
}

interface Window {
  SayeleGateSDK?: SayeleGateSDKConstructor;
}
