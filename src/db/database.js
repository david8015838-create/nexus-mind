import Dexie from 'dexie';

export const db = new Dexie('NexusMindDB');

db.version(2).stores({
  contacts: 'id, name, ocrText, phone, *tags, lastUpdated',
  settings: 'id'
});

const seedData = [
  {
    id: '1',
    name: '林書豪 (Sarah)',
    cardImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=1000&auto=format&fit=crop',
    ocrText: 'Sarah Lin 創意總監 Nexus Studio 台北市信義區',
    tags: ['台北', '創意總監', 'Nexus', '名片'],
    birthday: '1992-02-15',
    events: [
      { date: '2026-02-10', title: '專案啟動會議', type: 'meeting' }
    ],
    memories: [
      { date: new Date('2024-01-20'), content: '在信義區的咖啡廳討論了 Q3 的產品發表計畫。', location: '台北信義區' },
      { date: new Date('2024-01-25'), content: '她對區塊鏈技術在藝術領域的應用非常有興趣。', location: '線上會議' }
    ],
    importance: 85,
    lastUpdated: new Date()
  },
  {
    id: '2',
    name: '陳大文 (David)',
    cardImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop',
    ocrText: 'David Chen 技術長 TechFlow Solutions',
    tags: ['技術長', '創業家', 'AI', '台北'],
    birthday: '1985-05-20',
    events: [
      { date: '2026-02-05', title: '技術分享會', type: 'event' }
    ],
    memories: [
      { date: new Date('2024-02-10'), content: '在 Web3 峰會認識，對分散式存儲有深入研究。', location: '南港展覽館' }
    ],
    importance: 60,
    lastUpdated: new Date()
  },
  {
    id: '3',
    name: '王小明',
    cardImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
    ocrText: '王小明 投資經理 藍海創投',
    tags: ['投資', '創投', '融資', '重要'],
    birthday: '1988-01-30',
    events: [
      { date: '2026-01-30', title: 'A 輪融資簡報', type: 'task' }
    ],
    memories: [
      { date: new Date('2024-03-05'), content: '初步接觸，正在尋求 A 輪融資的建議。', location: '101 大樓' }
    ],
    importance: 95,
    lastUpdated: new Date()
  }
];

// Seed some initial data if empty
db.on('populate', () => {
  db.contacts.bulkAdd(seedData);
});

// Explicit check to ensure data exists
export const ensureSeedData = async (force = false) => {
  try {
    const count = await db.contacts.count();
    console.log('Current contact count:', count);
    if (count === 0 || force) {
      console.log(force ? 'Forcing seed data...' : 'Database empty, seeding data...');
      if (force) {
        await db.contacts.clear();
      }
      await db.contacts.bulkPut(seedData);
      console.log('Seed data inserted successfully');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};
