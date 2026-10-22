import { demoApps, demoInputs, normalizeApps, normalizeInputs, validAppId } from './catalog';
import type { Inventory, NativeBridge } from './types';

const active = new Set<NativeBridge>();
export const isTV = () =>
  typeof window !== 'undefined' &&
  !!(window.PalmSystem || window.webOSSystem) &&
  !!(window.PalmServiceBridge || window.webOSServiceBridge);
const manager = 'luna://com.webos.applicationManager/';

export function nativeCall(
  uri: string,
  payload: Record<string, unknown>,
  timeout = 6500,
): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const Bridge = window.PalmServiceBridge ?? window.webOSServiceBridge;
    if (!Bridge) {
      reject(new Error('This action is available on the TV.'));
      return;
    }
    let bridge: NativeBridge | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let done = false;
    const finish = (error: Error | null, result?: Record<string, any>) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (bridge) {
        active.delete(bridge);
        bridge.onservicecallback = () => {};
        try {
          bridge.cancel();
        } catch {
          /* Native object may already be closed. */
        }
      }
      if (error) reject(error);
      else resolve(result!);
    };
    timer = setTimeout(
      () =>
        finish(
          new Error(
            'The TV did not respond. Check Homebrew Channel’s root status, then try again.',
          ),
        ),
      timeout,
    );
    try {
      bridge = new Bridge();
      active.add(bridge);
      bridge.onservicecallback = (raw) => {
        try {
          if (typeof raw !== 'string' || raw.length > 2 * 1024 * 1024)
            throw new Error('The TV returned an unreadable response.');
          const value = JSON.parse(raw);
          if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('The TV returned an unreadable response.');
          if (
            value.returnValue !== true ||
            (value.errorCode !== undefined && value.errorCode !== 0 && value.errorCode !== '0')
          ) {
            throw new Error(
              typeof value.errorText === 'string'
                ? value.errorText.slice(0, 240)
                : 'The TV denied this action.',
            );
          }
          finish(null, value);
        } catch (error) {
          finish(
            error instanceof Error ? error : new Error('The TV returned an unreadable response.'),
          );
        }
      };
      bridge.call(uri, JSON.stringify(payload));
    } catch {
      finish(new Error('The webOS service bridge is unavailable.'));
    }
  });
}

// Calls a private webOS service through the existing elevated Homebrew service and returns
// its whole response. No credentials or environment reads; payload values are plain JSON
// built from validated identifiers, so they cannot leave the quoted shell argument.
async function rootRead(
  uri: string,
  payload: Record<string, string> = {},
  wait = 4000,
): Promise<Record<string, any>> {
  const command = `if [ "$(id -u)" = "0" ]; then /usr/bin/luna-send -n 1 -w ${wait} ${uri} '${JSON.stringify(payload)}'; else printf '%s\\n' '{"returnValue":false,"errorText":"Homebrew Channel needs root access."}'; fi`;
  const envelope = await nativeCall(
    'luna://org.webosbrew.hbchannel.service/exec',
    { command },
    wait + 2500,
  );
  if (
    [envelope.returnCode, envelope.exitCode].some(
      (code) => code !== undefined && code !== 0 && code !== '0',
    ) ||
    envelope.error ||
    envelope.stderrString
  )
    throw new Error('Homebrew Channel could not read the TV inventory. Check its root status.');
  if (typeof envelope.stdoutString !== 'string' || envelope.stdoutString.length > 2 * 1024 * 1024)
    throw new Error('Homebrew Channel returned no inventory.');
  const response = JSON.parse(envelope.stdoutString);
  if (response?.returnValue !== true)
    throw new Error(response?.errorText || 'The TV did not return its inventory.');
  return response;
}

async function inventoryRead(
  uri: string,
  field: string,
  payload: Record<string, string> = {},
): Promise<unknown> {
  const response = await rootRead(uri, payload);
  if (!Array.isArray(response[field])) throw new Error('The TV did not return its inventory.');
  return response[field];
}

export async function loadInventory(): Promise<Inventory> {
  if (!isTV())
    return {
      apps: demoApps,
      inputs: demoInputs,
      warnings: [],
    };
  const [apps, inputs] = await Promise.allSettled([
    inventoryRead(`${manager}listApps`, 'apps').then(normalizeApps),
    inventoryRead('luna://com.webos.service.eim/getAllInputStatus', 'devices').then(
      normalizeInputs,
    ),
  ]);
  if (apps.status === 'rejected')
    throw new Error(
      `Couldn’t load your apps. ${apps.reason instanceof Error ? apps.reason.message : 'Check Homebrew Channel’s root status.'}`,
    );
  return {
    apps: apps.value,
    inputs: inputs.status === 'fulfilled' ? inputs.value : [],
    warnings:
      inputs.status === 'rejected' ? ['Inputs couldn’t be loaded. Refresh to try again.'] : [],
  };
}

// `content` opens the app at a specific title through its webOS launch parameters.
// The highlighted content an app publishes for LG's home screen (YouTube, LG Channels…).
// Apps that publish nothing are rejected with "Contents for this app are unsupported".
export async function readAppContent(appId: string): Promise<unknown> {
  if (!validAppId(appId)) throw new Error('This app has an invalid identifier.');
  return inventoryRead('luna://com.webos.service.contentminer/getContentData', 'contents', {
    appId,
  });
}

// Netflix's partner "discovery" rows, as it provides them for LG's home screen: the
// profile's Continue Watching first, then today's picks. Each tile carries a deep link.
export async function readNetflixDiscovery(): Promise<unknown> {
  const response = await rootRead('luna://netflix.service/discovery', {}, 8000);
  return response.data?.discovery?.groups;
}

export async function launchApp(
  id: string,
  content?: { contentId?: string; params?: Record<string, string> },
): Promise<void> {
  if (!validAppId(id)) throw new Error('This app has an invalid identifier.');
  if (!isTV()) return;
  const status = await nativeCall(`${manager}getAppLoadStatus`, { appId: id });
  if (status.exist !== true)
    throw new Error('This app is no longer installed. Refresh your library.');
  // Public API + declared ACGs, rather than rewriting any system permissions.
  await nativeCall(`${manager}launch`, { id, ...content });
}

const HOME_WATCH = '/media/developer/apps/usr/palm/applications/com.luma.launcher/home-watch.sh';

// Starts or stops tv/home-watch.sh, which reopens Luma on wake and on LG's home screen.
export async function setHomeMode(enabled: boolean): Promise<void> {
  if (!isTV()) return;
  const envelope = await nativeCall('luna://org.webosbrew.hbchannel.service/exec', {
    command: `sh ${HOME_WATCH} ${enabled ? 'enable' : 'disable'}`,
  });
  if (
    [envelope.returnCode, envelope.exitCode].some(
      (code) => code !== undefined && code !== 0 && code !== '0',
    )
  )
    throw new Error(
      typeof envelope.stderrString === 'string' ? envelope.stderrString.slice(0, 240) : '',
    );
}

export function platformBack(): void {
  const system = window.PalmSystem ?? window.webOSSystem;
  system?.platformBack?.();
}
