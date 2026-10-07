import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmart.twebapp',
  appName: 'TWEB',
  webDir: 'public',
  server: {
    url: 'https://t-mart-inventory-system.vercel.app',
    androidScheme: 'https'
  },
  android: {
    captureInput: true
  }
};

export default config;
