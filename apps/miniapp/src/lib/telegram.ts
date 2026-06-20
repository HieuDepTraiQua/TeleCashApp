import WebApp from "@twa-dev/sdk";

export const tg = WebApp;
export const initData = WebApp.initData || "";
export const isTelegram = Boolean(WebApp.initData);

export function notify(msg: string): void {
  if (isTelegram) tg.showAlert(msg);
  else window.alert(msg);
}
