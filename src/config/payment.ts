export interface PaymentConfig {
  accountHolder: string;
  upiId: string;
  qrAssetPath: string;
  instruction: string;
}

export const PAYMENT_CONFIG: PaymentConfig = {
  accountHolder: 'Syed Kaleel Awn Mohamed Ismail',
  upiId: 'nutrisun@kvb',
  qrAssetPath: '/KVB_QR.png',
  instruction:
    process.env.NEXT_PUBLIC_PAYMENT_INSTRUCTION ||
    'Scan the QR using any UPI app, pay the exact amount shown, and confirm the completed payment below.',
};
