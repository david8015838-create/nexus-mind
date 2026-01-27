import Dexie from 'dexie';

export const db = new Dexie('NexusMindDB');

db.version(3).stores({
  contacts: 'id, name, ocrText, phone, *tags, lastUpdated',
  settings: 'id',
  schedules: 'id, title, date, *contactIds, type'
});

// Seed function removed as per user request
export const ensureSeedData = async (force = false) => {
  // No-op: Mock data disabled
};
