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
    'Important: After completing payment in your UPI app, return to the NutriSun app and tap “I Have Completed Payment”. Your purchase will not be submitted to the admin for approval until you confirm it.',
};
