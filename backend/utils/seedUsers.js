const { User } = require('../models/User');
const { Role } = require('../models/Role');
const { AuditLog } = require('../models/AuditLog');
const { connectDB, disconnectDB } = require('../config/db');

const seedUsersData = [
  {
    name: 'Admin',
    email: 'admin@cricforge.com',
    password_hash: 'Cricket@2026',
    roles: ['admin'],
    bio: 'Platform administration, security audits, role moderation and platform settings.'
  },
  {
    name: 'Vikram Mehta (Franchise Owner)',
    email: 'owner@cricforge.com',
    password_hash: 'Cricket@2026',
    roles: ['team_owner'],
    bio: 'Team owner managing squad budgets, auction bids, and team strategies.'
  },
  {
    name: 'Rahul Sharma (Official Scorer)',
    email: 'scorer@cricforge.com',
    password_hash: 'Cricket@2026',
    roles: ['scorer'],
    bio: 'Certified cricket scorer for collegiate tournaments and rapid live ball-by-ball logging.'
  },
  {
    name: 'Ananya Rao (Tournament Director)',
    email: 'organizer@cricforge.com',
    password_hash: 'Cricket@2026',
    roles: ['tournament_organizer'],
    bio: 'Organizer scheduling inter-college cups, fixtures and points table tracking.'
  },
  {
    name: 'Kavya Patel (Spectator)',
    email: 'spectator@cricforge.com',
    password_hash: 'Cricket@2026',
    roles: ['spectator'],
    bio: 'Passionate cricket enthusiast following live scorecards, player analytics and tournament standings.'
  }
];

const seedDatabase = async () => {
  console.log('Seeding CricForge demo users & roles...');
  await User.deleteMany({});
  await Role.deleteMany({});
  await AuditLog.deleteMany({});

  for (const data of seedUsersData) {
    const user = await User.create({
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      roles: data.roles,
      bio: data.bio,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name)}`
    });
    for (const roleType of data.roles) {
      await Role.create({ user_id: user._id, role_type: roleType });
    }
  }
  console.log(`Seeded ${seedUsersData.length} demo users. Password for all: Cricket@2026`);
};

if (require.main === module) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await disconnectDB();
    process.exit(0);
  })();
}

module.exports = { seedDatabase, seedUsersData };
