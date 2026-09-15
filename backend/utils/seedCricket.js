const Player = require('../models/Player');
const Team = require('../models/Team');
const { connectDB, disconnectDB } = require('../config/db');

const teamSeeds = [
  { teamName: 'Chennai Blazers', shortName: 'CBZ', color: '#111111' },
  { teamName: 'Mumbai Titans', shortName: 'MBT', color: '#222222' },
  { teamName: 'Bengaluru Falcons', shortName: 'BLF', color: '#333333' },
  { teamName: 'Delhi Warriors', shortName: 'DWR', color: '#000000' }
];

const firstNames = ['Arjun', 'Vikram', 'Karthik', 'Rohan', 'Aditya', 'Suresh', 'Manoj', 'Rahul', 'Sanjay', 'Anil', 'Deepak', 'Vishal', 'Kiran', 'Naveen', 'Ravi'];
const lastNames = ['Sharma', 'Iyer', 'Reddy', 'Nair', 'Patel', 'Kumar', 'Rao', 'Singh', 'Verma', 'Menon', 'Gupta', 'Pillai', 'Das', 'Chatterjee', 'Yadav'];
const roles = ['Batter', 'Batter', 'Bowler', 'Bowler', 'All-rounder', 'Wicketkeeper'];

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedCricketData = async () => {
  console.log('Seeding demo teams and players for auction/simulation...');
  await Player.deleteMany({});
  await Team.deleteMany({});

  const teams = await Team.insertMany(teamSeeds.map((t) => ({ ...t, purseTotal: 100, purseRemaining: 100 })));

  const players = [];
  for (let i = 0; i < 48; i++) {
    const name = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const role = roles[i % roles.length];
    players.push({
      name,
      age: randomBetween(19, 36),
      role,
      battingStyle: i % 4 === 0 ? 'Left Hand' : 'Right Hand',
      bowlingStyle: role === 'Bowler' || role === 'All-rounder' ? (i % 2 === 0 ? 'Right-arm fast' : 'Left-arm spin') : 'Not Specified',
      jerseyNumber: randomBetween(1, 99),
      battingRating: role === 'Bowler' ? randomBetween(20, 55) : randomBetween(45, 92),
      bowlingRating: role === 'Batter' ? randomBetween(10, 40) : randomBetween(45, 90),
      basePrice: [0.5, 1, 1.5, 2][i % 4],
      isSold: false
    });
  }
  const createdPlayers = await Player.insertMany(players);

  // Assign a starting XI to each seeded team so the Simulation Engine has
  // rosters to work with immediately (the Auction module can still
  // re-assign the remaining unsold players).
  for (let t = 0; t < teams.length; t++) {
    const squad = createdPlayers.slice(t * 11, t * 11 + 11);
    await Team.findByIdAndUpdate(teams[t]._id, { $set: { players: squad.map((p) => p._id) } });
    await Player.updateMany({ _id: { $in: squad.map((p) => p._id) } }, { $set: { teamId: teams[t]._id, isSold: true, soldPrice: 1 } });
  }

  console.log(`Seeded ${teams.length} teams and ${createdPlayers.length} players.`);
};

if (require.main === module) {
  (async () => {
    await connectDB();
    await seedCricketData();
    await disconnectDB();
    process.exit(0);
  })();
}

module.exports = { seedCricketData };
