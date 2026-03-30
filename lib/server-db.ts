import fs from 'fs';
import path from 'path';
import type {
  Club,
  ClubAttendancePoll,
  ClubChatMessage,
  ClubMember,
  Player,
  Trainer,
  TrainerMessage,
  TrainingSession,
} from '@/lib/db';

const DB_PATH = path.join(process.cwd(), 'data', 'training_db.json');
const DATA_DIR = path.join(process.cwd(), 'data');

interface TrainingDatabase {
  players: Player[];
  sessions: TrainingSession[];
  trainers: Trainer[];
  trainerMessages: TrainerMessage[];
  clubs: Club[];
  clubMembers: ClubMember[];
  clubMessages: ClubChatMessage[];
  clubPolls: ClubAttendancePoll[];
}

const INITIAL_DB: TrainingDatabase = {
  players: [],
  sessions: [],
  trainers: [],
  trainerMessages: [],
  clubs: [],
  clubMembers: [],
  clubMessages: [],
  clubPolls: [],
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 10) || 'spieler';
}

function createTempPassword() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function buildUsername(name: string, id: string) {
  return `${slugify(name)}${id.slice(-3).toLowerCase()}`;
}

function normalizePlayer(raw: Omit<Player, 'username' | 'tempPassword' | 'passwordResetRequired'> & Partial<Player>): Player {
  return {
    ...raw,
    username: raw.username || buildUsername(raw.name, raw.id),
    tempPassword: raw.tempPassword || raw.id.slice(-6).toUpperCase(),
    passwordResetRequired: raw.passwordResetRequired ?? true,
  };
}

function normalizeClub(raw: Club): Club {
  return {
    ...raw,
    allowedPlayerIds: Array.isArray(raw.allowedPlayerIds) ? raw.allowedPlayerIds : [],
  };
}

function ensureDbShape(raw: Partial<TrainingDatabase>): TrainingDatabase {
  return {
    players: (raw.players ?? []).map((player) => normalizePlayer(player)),
    sessions: raw.sessions ?? [],
    trainers: raw.trainers ?? [],
    trainerMessages: raw.trainerMessages ?? [],
    clubs: (raw.clubs ?? []).map((club) => normalizeClub(club)),
    clubMembers: raw.clubMembers ?? [],
    clubMessages: raw.clubMessages ?? [],
    clubPolls: raw.clubPolls ?? [],
  };
}

function readDB(): TrainingDatabase {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2));
    return INITIAL_DB;
  }

  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return ensureDbShape(JSON.parse(data) as Partial<TrainingDatabase>);
}

function writeDB(data: TrainingDatabase) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createInviteToken() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function extractGameIds(text: string) {
  const matches = text.match(/@([A-Za-z0-9_-]+)/g) ?? [];
  return Array.from(new Set(matches.map((match) => match.slice(1))));
}

export const serverDb = {
  getPlayers: () => readDB().players,
  savePlayer: (player: Player) => {
    const db = readDB();
    db.players.push(normalizePlayer(player));
    writeDB(db);
    return db.players[db.players.length - 1];
  },
  deletePlayer: (id: string) => {
    const db = readDB();
    db.players = db.players.filter((player) => player.id !== id);
    db.sessions = db.sessions.filter((session) => session.playerId !== id);
    db.trainerMessages = db.trainerMessages.filter((message) => message.playerId !== id);
    db.clubMembers = db.clubMembers.filter((member) => !(member.memberType === 'player' && member.memberId === id));
    writeDB(db);
  },

  getSessions: () => readDB().sessions,
  saveSession: (session: TrainingSession) => {
    const db = readDB();
    db.sessions.unshift(session);
    writeDB(db);
    return session;
  },

  getTrainers: () => readDB().trainers,
  saveTrainer: (trainer: Trainer) => {
    const db = readDB();
    if (!db.trainers.find((entry) => entry.email === trainer.email)) {
      db.trainers.push(trainer);
      writeDB(db);
    }
    return trainer;
  },

  getTrainerMessages: () => readDB().trainerMessages,
  saveTrainerMessage: (message: Omit<TrainerMessage, 'id' | 'createdAt'>) => {
    const db = readDB();
    const saved: TrainerMessage = {
      ...message,
      id: createId('msg'),
      createdAt: new Date().toISOString(),
    };
    db.trainerMessages.unshift(saved);
    writeDB(db);
    return saved;
  },

  getClubs: () => readDB().clubs,
  getClubMembers: () => readDB().clubMembers,
  getClubMessages: () => readDB().clubMessages,
  getClubPolls: () => readDB().clubPolls,

  createClub: (params: { name: string; ownerTrainerEmail: string; ownerName: string }) => {
    const db = readDB();
    const club: Club = {
      id: createId('club'),
      name: params.name,
      ownerTrainerEmail: params.ownerTrainerEmail,
      inviteToken: createInviteToken(),
      createdAt: new Date().toISOString(),
      allowedPlayerIds: [],
    };
    db.clubs.unshift(club);
    db.clubMembers.push({
      clubId: club.id,
      memberType: 'trainer',
      memberId: params.ownerTrainerEmail,
      displayName: params.ownerName,
      joinedAt: new Date().toISOString(),
    });
    writeDB(db);
    return club;
  },

  joinClub: (params: { inviteToken: string; memberType: 'trainer' | 'player' | 'guest'; memberId: string; displayName: string }) => {
    const db = readDB();
    const clubIndex = db.clubs.findIndex((entry) => entry.inviteToken === params.inviteToken);
    if (clubIndex === -1) {
      return null;
    }

    const club = normalizeClub(db.clubs[clubIndex]);
    db.clubs[clubIndex] = club;

    if (params.memberType === 'player' && !club.allowedPlayerIds.includes(params.memberId)) {
      return 'forbidden';
    }

    const existing = db.clubMembers.find(
      (member) =>
        member.clubId === club.id &&
        member.memberType === params.memberType &&
        member.memberId === params.memberId
    );

    if (!existing) {
      db.clubMembers.push({
        clubId: club.id,
        memberType: params.memberType,
        memberId: params.memberId,
        displayName: params.displayName,
        joinedAt: new Date().toISOString(),
      });
      writeDB(db);
    }

    return club;
  },

  addClubAllowedPlayer: (clubId: string, playerId: string) => {
    const db = readDB();
    const clubIndex = db.clubs.findIndex((entry) => entry.id === clubId);
    if (clubIndex === -1) return null;

    const club = normalizeClub(db.clubs[clubIndex]);
    db.clubs[clubIndex] = club;

    if (!club.allowedPlayerIds.includes(playerId)) {
      club.allowedPlayerIds.push(playerId);
      writeDB(db);
    }

    return club;
  },

  saveClubMessage: (message: Omit<ClubChatMessage, 'id' | 'createdAt'>) => {
    const db = readDB();
    const saved: ClubChatMessage = {
      ...message,
      id: createId('clubmsg'),
      createdAt: new Date().toISOString(),
    };
    db.clubMessages.push(saved);

    const gameIds = extractGameIds(saved.text);
    for (const gameId of gameIds) {
      const existingPoll = db.clubPolls.find((poll) => poll.clubId === saved.clubId && poll.gameId === gameId);
      if (!existingPoll) {
        db.clubPolls.push({
          id: createId('poll'),
          clubId: saved.clubId,
          gameId,
          sourceMessageId: saved.id,
          createdAt: new Date().toISOString(),
          votes: [],
        });
      }
    }

    writeDB(db);
    return saved;
  },

  voteClubPoll: (params: {
    pollId: string;
    memberType: 'trainer' | 'player' | 'guest';
    memberId: string;
    displayName: string;
    status: 'yes' | 'no' | 'maybe';
  }) => {
    const db = readDB();
    const poll = db.clubPolls.find((entry) => entry.id === params.pollId);
    if (!poll) return null;

    const existingVote = poll.votes.find(
      (vote) => vote.memberType === params.memberType && vote.memberId === params.memberId
    );

    if (existingVote) {
      existingVote.status = params.status;
      existingVote.displayName = params.displayName;
      existingVote.updatedAt = new Date().toISOString();
    } else {
      poll.votes.push({
        memberType: params.memberType,
        memberId: params.memberId,
        displayName: params.displayName,
        status: params.status,
        updatedAt: new Date().toISOString(),
      });
    }

    writeDB(db);
    return poll;
  },

  findPlayerByCredentials: (username: string, tempPassword: string) => {
    const db = readDB();
    return db.players.find(
      (player) =>
        player.username.toLowerCase() === username.toLowerCase().trim() &&
        player.tempPassword === tempPassword.trim().toUpperCase()
    ) ?? null;
  },

  resetPlayerPassword: (playerId: string) => {
    const db = readDB();
    const player = db.players.find((entry) => entry.id === playerId);
    if (!player) return null;

    player.tempPassword = createTempPassword();
    player.passwordResetRequired = true;
    writeDB(db);
    return player;
  },

  createPlayerCredentials: (name: string, id: string) => ({
    username: buildUsername(name, id),
    tempPassword: createTempPassword(),
  }),
};
