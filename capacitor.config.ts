import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmart.twebapp',
  appName: 'TWEB',
  webDir: 'public',
  server: {
    url: 'https://tweb-production-new.vercel.app',
    androidScheme: 'https'
  },
  android: {
    captureInput: true
  }
};

export default config;
