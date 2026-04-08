/**
 * Database Service Bridge
 * Synchronizes with server-side local JSON database
 */

export interface Player {
  id: string;
  name: string;
  trainerEmail: string;
  createdAt: string;
  username: string;
  tempPassword: string;
  passwordResetRequired: boolean;
}

export interface Throw {
  id: number;
  pins: number[];
  timestamp: string;
}

export interface TrainingSession {
  id: string;
  playerId: string;
  playerName?: string;
  trainerEmail: string;
  timestamp: string;
  type: 'standard' | 'game_120';
  recorderId?: string;
  recorderName?: string;
  throws: Throw[];
  lanes?: {
    1: Throw[];
    2: Throw[];
    3: Throw[];
    4: Throw[];
  };
}

export interface Trainer {
  email: string;
  name: string;
  role: 'trainer';
}

export interface GuestUser {
  id: string;
  name: string;
  tempCode: string;
  role: 'guest';
}

export interface TrainerMessage {
  id: string;
  playerId: string;
  trainerEmail: string;
  text: string;
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  ownerTrainerEmail: string;
  inviteToken: string;
  createdAt: string;
  allowedPlayerIds: string[];
}

export interface ClubMember {
  clubId: string;
  memberType: 'trainer' | 'player' | 'guest';
  memberId: string;
  displayName: string;
  joinedAt: string;
}

export interface ClubChatMessage {
  id: string;
  clubId: string;
  authorType: 'trainer' | 'player' | 'guest';
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ClubPollVote {
  memberType: 'trainer' | 'player' | 'guest';
  memberId: string;
  displayName: string;
  status: 'yes' | 'no' | 'maybe';
  updatedAt: string;
}

export interface ClubAttendancePoll {
  id: string;
  clubId: string;
  gameId: string;
  sourceMessageId: string;
  createdAt: string;
  votes: ClubPollVote[];
}

export type GameDetailCell = string | number | null | undefined;
export type GameDetailRow = GameDetailCell[];

export interface GameResultLookup {
  gameId: string;
  seasonId: string;
  leagueId: string;
  leagueName: string;
  spieltag: string;
  dateTime: string;
  teamHome: string;
  teamAway: string;
  result: string;
  isCompleted: boolean;
  detailRows: GameDetailRow[];
}

export interface ClubBundle {
  club: Club | null;
  members: ClubMember[];
  messages: ClubChatMessage[];
  polls: ClubAttendancePoll[];
}

function normalizeClub(club: Club): Club {
  return {
    ...club,
    allowedPlayerIds: Array.isArray(club.allowedPlayerIds) ? club.allowedPlayerIds : [],
  };
}

interface SessionQueryParams {
  playerId?: string;
  trainerEmail?: string;
}

interface MessageQueryParams {
  playerId?: string;
  trainerEmail?: string;
}

interface ClubQueryParams {
  trainerEmail?: string;
  memberType?: 'trainer' | 'player' | 'guest';
  memberId?: string;
  inviteToken?: string;
}

type JoinClubPayload = {
  action: 'join';
  inviteToken: string;
  memberType: 'trainer' | 'player' | 'guest';
  memberId: string;
  displayName: string;
};

type CreateClubPayload = {
  action: 'create';
  name: string;
  ownerTrainerEmail: string;
  ownerName: string;
};

type AddClubMemberPayload = {
  action: 'add-member';
  clubId: string;
  playerId: string;
};

type VotePayload = {
  action: 'vote';
  pollId: string;
  memberType: 'trainer' | 'player' | 'guest';
  memberId: string;
  displayName: string;
  status: 'yes' | 'no' | 'maybe';
};

type SendClubMessagePayload = {
  action: 'message';
  clubId: string;
  authorType: 'trainer' | 'player' | 'guest';
  authorId: string;
  authorName: string;
  text: string;
};

function toQuery(params: Record<string, string | undefined>) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined))
  ).toString();
}

export const db = {
  getPlayers: async (trainerEmail?: string): Promise<Player[]> => {
    const url = `/api/training/players${trainerEmail ? `?trainerEmail=${encodeURIComponent(trainerEmail)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  savePlayer: async (player: Player) => {
    const res = await fetch('/api/training/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player),
    });
    return res.json();
  },

  deletePlayer: async (id: string) => {
    const res = await fetch(`/api/training/players?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  getSessions: async (params: SessionQueryParams): Promise<TrainingSession[]> => {
    const query = toQuery(params);
    const res = await fetch(`/api/training/sessions?${query}`);
    if (!res.ok) return [];
    return res.json();
  },

  saveSession: async (session: TrainingSession) => {
    const res = await fetch('/api/training/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    return res.json();
  },

  getTrainerMessages: async (params: MessageQueryParams): Promise<TrainerMessage[]> => {
    const query = toQuery(params);
    const res = await fetch(`/api/training/messages?${query}`);
    if (!res.ok) return [];
    return res.json();
  },

  saveTrainerMessage: async (message: Omit<TrainerMessage, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/training/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return res.json();
  },

  getClubs: async (params: ClubQueryParams): Promise<Club[]> => {
    const query = toQuery({
      trainerEmail: params.trainerEmail,
      memberType: params.memberType,
      memberId: params.memberId,
      inviteToken: params.inviteToken,
    });
    const res = await fetch(`/api/training/clubs?${query}`);
    if (!res.ok) return [];
    const clubs = (await res.json()) as Club[];
    return clubs.map((club) => normalizeClub(club));
  },

  createClub: async (payload: Omit<CreateClubPayload, 'action'>) => {
    const body: CreateClubPayload = { action: 'create', ...payload };
    const res = await fetch('/api/training/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  joinClub: async (payload: Omit<JoinClubPayload, 'action'>) => {
    const body: JoinClubPayload = { action: 'join', ...payload };
    const res = await fetch('/api/training/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Join failed');
    return res.json();
  },

  addClubMember: async (payload: Omit<AddClubMemberPayload, 'action'>) => {
    const body: AddClubMemberPayload = { action: 'add-member', ...payload };
    const res = await fetch('/api/training/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Add member failed');
    return res.json();
  },

  getClubBundle: async (clubId: string): Promise<ClubBundle | null> => {
    const res = await fetch(`/api/training/club-chat?clubId=${encodeURIComponent(clubId)}`);
    if (!res.ok) return null;
    return res.json();
  },

  sendClubMessage: async (payload: Omit<SendClubMessagePayload, 'action'>) => {
    const body: SendClubMessagePayload = { action: 'message', ...payload };
    const res = await fetch('/api/training/club-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  voteClubPoll: async (payload: Omit<VotePayload, 'action'>) => {
    const body: VotePayload = { action: 'vote', ...payload };
    const res = await fetch('/api/training/club-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  getGameResult: async (gameId: string): Promise<GameResultLookup | null> => {
    const res = await fetch(`/api/training/game-result?gameId=${encodeURIComponent(gameId)}`);
    if (!res.ok) return null;
    return res.json();
  },

  loginTrainer: async (email: string): Promise<Trainer | null> => {
    const res = await fetch('/api/training/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trainer-login', email }),
    });
    if (!res.ok) return null;
    return res.json();
  },

  loginPlayer: async (username: string, tempPassword: string): Promise<Player | null> => {
    const res = await fetch('/api/training/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'player-login', username, tempPassword }),
    });
    if (!res.ok) return null;
    return res.json();
  },

  resetPlayerPassword: async (playerId: string): Promise<Player | null> => {
    const res = await fetch('/api/training/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-player-password', playerId }),
    });
    if (!res.ok) return null;
    return res.json();
  },
};
