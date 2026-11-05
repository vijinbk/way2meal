/**
 * API base URL, set per build via EXPO_PUBLIC_API_URL (see .env.example).
 * Android emulators reach the host machine at 10.0.2.2; a phone on the same
 * Wi-Fi needs the computer's LAN IP.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/v1').replace(
  /\/$/,
  '',
);
