import APIHandler from '@/server/api-handler';

export interface PushSubscriptionInput {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export interface TeamSubscriptionFilter {
  season: string;
  league: string;
  team: string;
}

export interface NotificationSubscriptionRecord extends TeamSubscriptionFilter {
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
  updatedAt: string;
}

type StoreShape = {
  subscriptions: NotificationSubscriptionRecord[];
  gameStates: Record<string, string>;
  activeGameIds: Record<string, string[]>;
};

type SpielplanRow = [string, string, string, string, string, string, string, string, string];

const STORE_KEY = 'kegel:notifications:v1';
const DEFAULT_STORE: StoreShape = {
  subscriptions: [],
  gameStates: {},
  activeGameIds: {},
};

const memoryStore: { value: StoreShape } = { value: DEFAULT_STORE };

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeTeam(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function parseGameDate(value: string): Date | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const dm = trimmed.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dm) {
    const year = Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]);
    const month = Number(dm[2]) - 1;
    const day = Number(dm[1]);
    const hour = dm[4] ? Number(dm[4]) : 0;
    const minute = dm[5] ? Number(dm[5]) : 0;
    const date = new Date(year, month, day, hour, minute, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseCellNumber(value: string | number | null | undefined): number | null {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-' || raw === '–') return null;
  const asNumber = Number(raw.replace(',', '.'));
  return Number.isFinite(asNumber) ? asNumber : null;
}

function subscriptionIdentity(filter: TeamSubscriptionFilter, endpoint: string): string {
  return `${endpoint}|${filter.season}|${filter.league}|${filter.team}`;
}

async function readJsonStore(): Promise<StoreShape> {
  const restUrl = process.env.KV_REST_API_URL;
  const restToken = process.env.KV_REST_API_TOKEN;
  if (!restUrl || !restToken) return memoryStore.value;

  const response = await fetch(`${restUrl}/get/${encodeURIComponent(STORE_KEY)}`, {
    headers: { Authorization: `Bearer ${restToken}` },
    cache: 'no-store',
  });
  if (!response.ok) return DEFAULT_STORE;
  const json = (await response.json()) as { result?: string | null };
  if (!json?.result) return DEFAULT_STORE;
  try {
    const parsed = JSON.parse(json.result) as StoreShape;
    return {
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      gameStates: parsed.gameStates || {},
      activeGameIds: parsed.activeGameIds || {},
    };
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeJsonStore(value: StoreShape): Promise<void> {
  const restUrl = process.env.KV_REST_API_URL;
  const restToken = process.env.KV_REST_API_TOKEN;
  if (!restUrl || !restToken) {
    memoryStore.value = value;
    return;
  }

  await fetch(`${restUrl}/set/${encodeURIComponent(STORE_KEY)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${restToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
    cache: 'no-store',
  });
}

async function withStoreMutation<T>(mutate: (store: StoreShape) => T | Promise<T>): Promise<T> {
  const current = await readJsonStore();
  const cloned: StoreShape = {
    subscriptions: [...current.subscriptions],
    gameStates: { ...current.gameStates },
    activeGameIds: { ...current.activeGameIds },
  };
  const out = await mutate(cloned);
  await writeJsonStore(cloned);
  return out;
}

export async function subscribePush(
  filter: TeamSubscriptionFilter,
  subscription: PushSubscriptionInput
): Promise<NotificationSubscriptionRecord> {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Invalid push subscription payload.');
  }

  return withStoreMutation((store) => {
    const id = subscriptionIdentity(filter, subscription.endpoint);
    const next: NotificationSubscriptionRecord = {
      ...filter,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const index = store.subscriptions.findIndex((item) => subscriptionIdentity(item, item.endpoint) === id);
    if (index >= 0) {
      store.subscriptions[index] = {
        ...store.subscriptions[index],
        ...next,
        createdAt: store.subscriptions[index].createdAt,
        updatedAt: nowIso(),
      };
      return store.subscriptions[index];
    }
    store.subscriptions.push(next);
    return next;
  });
}

export async function unsubscribePush(filter: TeamSubscriptionFilter, endpoint: string): Promise<boolean> {
  return withStoreMutation((store) => {
    const before = store.subscriptions.length;
    store.subscriptions = store.subscriptions.filter(
      (item) =>
        !(
          item.endpoint === endpoint &&
          item.season === filter.season &&
          item.league === filter.league &&
          item.team === filter.team
        )
    );
    delete store.activeGameIds[subscriptionIdentity(filter, endpoint)];
    return store.subscriptions.length < before;
  });
}

export async function getSubscriptionStatus(
  filter: TeamSubscriptionFilter,
  endpoint: string
): Promise<{ subscribed: boolean; activeGameIds: string[] }> {
  const store = await readJsonStore();
  const id = subscriptionIdentity(filter, endpoint);
  const subscribed = store.subscriptions.some(
    (item) =>
      item.endpoint === endpoint &&
      item.season === filter.season &&
      item.league === filter.league &&
      item.team === filter.team
  );
  return {
    subscribed,
    activeGameIds: store.activeGameIds[id] || [],
  };
}

async function getPushClient() {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  if (!vapidPublic || !vapidPrivate) {
    throw new Error('VAPID keys are not configured.');
  }
  const webPushModule = (await import('web-push')) as unknown as {
    setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
    sendNotification: (subscription: unknown, payload: string) => Promise<void>;
  };
  webPushModule.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  return webPushModule;
}

async function fetchSpielplan(
  apiHandler: APIHandler,
  season: string,
  league: string
): Promise<
  Array<{
    gameId: string;
    dateTime: string;
    teamHome: string;
    teamAway: string;
    result: string;
  }>
> {
  const raw = (await apiHandler.handleCommand('GetSpielplan', {
    id_saison: season,
    id_liga: league,
  })) as SpielplanRow[];

  return raw.map((row) => ({
    gameId: String(row?.[1] ?? ''),
    dateTime: String(row?.[3] ?? ''),
    teamHome: String(row?.[4] ?? ''),
    teamAway: String(row?.[5] ?? ''),
    result: String(row?.[6] ?? ''),
  }));
}

async function fetchGameLiveState(apiHandler: APIHandler, season: string, gameId: string): Promise<string | null> {
  const rows = (await apiHandler.handleCommand('GetSpielerInfo', {
    id_saison: season,
    id_spiel: gameId,
    wertung: '1',
  })) as Array<Array<string | number | null | undefined>>;

  const totalsRow = rows.find((row) => row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10]);
  if (!totalsRow) return null;

  const leftKegel = parseCellNumber(totalsRow[5]);
  const rightKegel = parseCellNumber(totalsRow[10]);
  if (leftKegel === null || rightKegel === null) return null;
  return `${leftKegel}:${rightKegel}`;
}

function buildLiveMessage(
  teamHome: string,
  teamAway: string,
  state: string
): { body: string; leader: string; diff: number } {
  const [leftRaw, rightRaw] = state.split(':');
  const left = Number(leftRaw);
  const right = Number(rightRaw);
  const diff = Math.abs(left - right);
  const leader =
    left > right ? `${teamHome} fuehrt` : right > left ? `${teamAway} fuehrt` : 'Gleichstand';
  return {
    body: `${teamHome} vs ${teamAway}: ${state} (${leader}, Diff ${diff})`,
    leader,
    diff,
  };
}

export async function pollAndDispatchLivePushes(options?: { now?: Date }): Promise<{
  totalSubscriptions: number;
  totalActiveGames: number;
  pushed: number;
}> {
  const now = options?.now ?? new Date();
  const store = await readJsonStore();
  const subscriptions = store.subscriptions;
  if (subscriptions.length === 0) {
    return { totalSubscriptions: 0, totalActiveGames: 0, pushed: 0 };
  }

  const apiHandler = new APIHandler();
  const webPush = await getPushClient();
  let pushed = 0;
  let totalActiveGames = 0;

  const grouped = new Map<string, NotificationSubscriptionRecord[]>();
  subscriptions.forEach((sub) => {
    const key = `${sub.season}|${sub.league}`;
    const arr = grouped.get(key) || [];
    arr.push(sub);
    grouped.set(key, arr);
  });

  await withStoreMutation(async (mutatingStore) => {
    for (const [seasonLeagueKey, groupSubs] of grouped.entries()) {
      const [season, league] = seasonLeagueKey.split('|');
      const plan = await fetchSpielplan(apiHandler, season, league);

      for (const sub of groupSubs) {
        const identity = subscriptionIdentity(sub, sub.endpoint);
        const teamNorm = normalizeTeam(sub.team);
        const candidateGames = plan.filter((game) => {
          if (!game.gameId) return false;
          return normalizeTeam(game.teamHome) === teamNorm || normalizeTeam(game.teamAway) === teamNorm;
        });

        const activeGames = candidateGames.filter((game) => {
          const start = parseGameDate(game.dateTime);
          if (!start) return false;
          const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
          return now >= start && now <= end;
        });

        const activeIds = activeGames.map((game) => game.gameId);
        mutatingStore.activeGameIds[identity] = activeIds;
        totalActiveGames += activeIds.length;

        for (const game of activeGames) {
          const liveState = await fetchGameLiveState(apiHandler, sub.season, game.gameId);
          if (!liveState) continue;

          const stateKey = `${identity}|${game.gameId}`;
          const prevState = mutatingStore.gameStates[stateKey] || '';
          if (prevState === liveState) continue;

          const message = buildLiveMessage(game.teamHome, game.teamAway, liveState);
          const payload = {
            type: prevState ? 'score_changed' : 'game_started',
            gameId: game.gameId,
            state: liveState,
            title: `${sub.team}: Live-Update`,
            body: message.body,
            url: `/tournaments?season=${encodeURIComponent(sub.season)}&league=${encodeURIComponent(
              sub.league
            )}&team=${encodeURIComponent(sub.team)}`,
            timestamp: nowIso(),
          };

          try {
            await webPush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              JSON.stringify(payload)
            );
            mutatingStore.gameStates[stateKey] = liveState;
            pushed += 1;
          } catch (error) {
            const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
            if (statusCode === 404 || statusCode === 410) {
              mutatingStore.subscriptions = mutatingStore.subscriptions.filter(
                (item) =>
                  !(
                    item.endpoint === sub.endpoint &&
                    item.season === sub.season &&
                    item.league === sub.league &&
                    item.team === sub.team
                  )
              );
              delete mutatingStore.activeGameIds[identity];
            }
            console.error('Failed to send push notification:', error);
          }
        }
      }
    }
    return null;
  });

  return {
    totalSubscriptions: subscriptions.length,
    totalActiveGames,
    pushed,
  };
}
