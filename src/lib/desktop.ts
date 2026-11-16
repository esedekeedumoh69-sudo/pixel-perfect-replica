/**
 * Bridge to the Electron preload script. In the web preview, falls back to browser APIs.
 * The preload exposes `window.lightgrabDesktop` (see electron/preload.cjs).
 */
export interface DesktopBridge {
  isDesktop: true;
  getDeviceInfo: () => Promise<{ deviceId: string; deviceName: string; platform: string; appVersion: string }>;
  secureStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    lightgrabDesktop?: DesktopBridge;
  }
}

export const APP_VERSION = "0.1.0";

export function getDesktop(): DesktopBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return window.lightgrabDesktop;
}

const WEB_DEVICE_KEY = "lightgrab.device_id";

export async function getDeviceInfo() {
  const desktop = getDesktop();
  if (desktop) return desktop.getDeviceInfo();
  let id = window.localStorage.getItem(WEB_DEVICE_KEY);
  if (!id) {
    id = "web-" + crypto.randomUUID();
    window.localStorage.setItem(WEB_DEVICE_KEY, id);
  }
  const ua = navigator.userAgent;
  const platform = /Windows/i.test(ua) ? "windows" : /Mac/i.test(ua) ? "mac" : /Linux/i.test(ua) ? "linux" : "web";
  return { deviceId: id, deviceName: "Web preview (" + platform + ")", platform: "web-" + platform, appVersion: APP_VERSION };
}
