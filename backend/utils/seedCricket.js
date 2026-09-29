const Player = require('../models/Player');
const Team = require('../models/Team');
const { connectDB, disconnectDB } = require('../config/db');

// Curated IPL squad snapshot for demo and simulation use. Refresh this list
// against an approved provider before using it for an official competition.
const iplTeams = [
  {
    teamId: 'IPL-CSK', teamName: 'Chennai Super Kings', shortName: 'CSK', color: '#f5c400',
    captain: 'Ruturaj Gaikwad', keeper: 'MS Dhoni',
    players: [
      ['Ruturaj Gaikwad', 'Batter', 'Right Hand', 'Not Specified'], ['MS Dhoni', 'Wicketkeeper', 'Right Hand', 'Not Specified'],
      ['Devon Conway', 'Batter', 'Left Hand', 'Not Specified'], ['Shivam Dube', 'All-rounder', 'Left Hand', 'Right-arm medium'],
      ['Ravindra Jadeja', 'All-rounder', 'Left Hand', 'Left-arm spin'], ['Moeen Ali', 'All-rounder', 'Left Hand', 'Right-arm spin'],
      ['Daryl Mitchell', 'All-rounder', 'Right Hand', 'Right-arm medium'], ['Deepak Chahar', 'Bowler', 'Right Hand', 'Right-arm medium'],
      ['Maheesh Theekshana', 'Bowler', 'Right Hand', 'Right-arm spin'], ['Matheesha Pathirana', 'Bowler', 'Right Hand', 'Right-arm fast'],
      ['Tushar Deshpande', 'Bowler', 'Right Hand', 'Right-arm medium']
    ]
  },
  {
    teamId: 'IPL-MI', teamName: 'Mumbai Indians', shortName: 'MI', color: '#005da8',
    captain: 'Hardik Pandya', keeper: 'Ishan Kishan',
    players: [
      ['Rohit Sharma', 'Batter', 'Right Hand', 'Not Specified'], ['Suryakumar Yadav', 'Batter', 'Right Hand', 'Not Specified'],
      ['Hardik Pandya', 'All-rounder', 'Right Hand', 'Right-arm medium'], ['Ishan Kishan', 'Wicketkeeper', 'Left Hand', 'Not Specified'],
      ['Tilak Varma', 'Batter', 'Left Hand', 'Right-arm spin'], ['Tim David', 'Batter', 'Right Hand', 'Not Specified'],
      ['Naman Dhir', 'All-rounder', 'Right Hand', 'Right-arm medium'], ['Jasprit Bumrah', 'Bowler', 'Right Hand', 'Right-arm fast'],
      ['Gerald Coetzee', 'Bowler', 'Right Hand', 'Right-arm fast'], ['Piyush Chawla', 'Bowler', 'Right Hand', 'Right-arm spin'],
      ['Akash Madhwal', 'Bowler', 'Right Hand', 'Right-arm fast']
    ]
  },
  {
    teamId: 'IPL-RCB', teamName: 'Royal Challengers Bengaluru', shortName: 'RCB', color: '#c8102e',
    captain: 'Faf du Plessis', keeper: 'Dinesh Karthik',
    players: [
      ['Faf du Plessis', 'Batter', 'Right Hand', 'Not Specified'], ['Virat Kohli', 'Batter', 'Right Hand', 'Not Specified'],
      ['Rajat Patidar', 'Batter', 'Right Hand', 'Not Specified'], ['Cameron Green', 'All-rounder', 'Right Hand', 'Right-arm medium'],
      ['Glenn Maxwell', 'All-rounder', 'Right Hand', 'Right-arm spin'], ['Dinesh Karthik', 'Wicketkeeper', 'Right Hand', 'Not Specified'],
      ['Mahipal Lomror', 'All-rounder', 'Left Hand', 'Left-arm spin'], ['Mohammed Siraj', 'Bowler', 'Right Hand', 'Right-arm fast'],
      ['Yash Dayal', 'Bowler', 'Left Hand', 'Left-arm medium'], ['Reece Topley', 'Bowler', 'Left Hand', 'Left-arm fast'],
      ['Karn Sharma', 'Bowler', 'Right Hand', 'Right-arm spin']
    ]
  },
  {
    teamId: 'IPL-KKR', teamName: 'Kolkata Knight Riders', shortName: 'KKR', color: '#542d83',
    captain: 'Shreyas Iyer', keeper: 'Phil Salt',
    players: [
      ['Shreyas Iyer', 'Batter', 'Right Hand', 'Not Specified'], ['Phil Salt', 'Wicketkeeper', 'Right Hand', 'Not Specified'],
      ['Sunil Narine', 'All-rounder', 'Left Hand', 'Right-arm spin'], ['Venkatesh Iyer', 'All-rounder', 'Left Hand', 'Right-arm medium'],
      ['Rinku Singh', 'Batter', 'Left Hand', 'Not Specified'], ['Andre Russell', 'All-rounder', 'Right Hand', 'Right-arm fast'],
      ['Ramandeep Singh', 'All-rounder', 'Right Hand', 'Right-arm medium'], ['Mitchell Starc', 'Bowler', 'Left Hand', 'Left-arm fast'],
      ['Varun Chakravarthy', 'Bowler', 'Right Hand', 'Right-arm spin'], ['Harshit Rana', 'Bowler', 'Right Hand', 'Right-arm fast'],
      ['Vaibhav Arora', 'Bowler', 'Right Hand', 'Right-arm medium']
    ]
  },
  {
    teamId: 'IPL-SRH', teamName: 'Sunrisers Hyderabad', shortName: 'SRH', color: '#f26522',
    captain: 'Pat Cummins', keeper: 'Heinrich Klaasen',
    players: [
      ['Travis Head', 'Batter', 'Left Hand', 'Not Specified'], ['Abhishek Sharma', 'All-rounder', 'Left Hand', 'Left-arm spin'],
      ['Heinrich Klaasen', 'Wicketkeeper', 'Right Hand', 'Not Specified'], ['Aiden Markram', 'All-rounder', 'Right Hand', 'Right-arm medium'],
      ['Nitish Reddy', 'All-rounder', 'Right Hand', 'Right-arm medium'], ['Rahul Tripathi', 'Batter', 'Right Hand', 'Not Specified'],
      ['Shahbaz Ahmed', 'All-rounder', 'Left Hand', 'Left-arm spin'], ['Pat Cummins', 'Bowler', 'Right Hand', 'Right-arm fast'],
      ['Bhuvneshwar Kumar', 'Bowler', 'Right Hand', 'Right-arm medium'], ['T Natarajan', 'Bowler', 'Left Hand', 'Left-arm medium'],
      ['Mayank Markande', 'Bowler', 'Right Hand', 'Right-arm spin']
    ]
  },
  {
    teamId: 'IPL-RR', teamName: 'Rajasthan Royals', shortName: 'RR', color: '#ea1a85',
    captain: 'Sanju Samson', keeper: 'Sanju Samson',
    players: [
      ['Yashasvi Jaiswal', 'Batter', 'Left Hand', 'Not Specified'], ['Jos Buttler', 'Wicketkeeper', 'Right Hand', 'Not Specified'],
      ['Sanju Samson', 'Wicketkeeper', 'Right Hand', 'Not Specified'], ['Shimron Hetmyer', 'Batter', 'Left Hand', 'Not Specified'],
      ['Riyan Parag', 'All-rounder', 'Right Hand', 'Right-arm spin'], ['Ravichandran Ashwin', 'All-rounder', 'Right Hand', 'Right-arm spin'],
      ['Dhruv Jurel', 'Wicketkeeper', 'Right Hand', 'Not Specified'], ['Trent Boult', 'Bowler', 'Left Hand', 'Left-arm fast'],
      ['Sandeep Sharma', 'Bowler', 'Right Hand', 'Right-arm medium'], ['Yuzvendra Chahal', 'Bowler', 'Right Hand', 'Right-arm spin'],
      ['Avesh Khan', 'Bowler', 'Right Hand', 'Right-arm fast']
    ]
  }
];

const seedCricketData = async () => {
  console.log('Seeding IPL demo teams and preserving user-created local teams...');

  for (const teamSeed of iplTeams) {
    const team = await Team.findOneAndUpdate(
      { teamId: teamSeed.teamId },
      { $set: { teamName: teamSeed.teamName, shortName: teamSeed.shortName, color: teamSeed.color, purseTotal: 100, purseRemaining: 100 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const playerIds = [];
    const createdPlayers = [];
    for (let index = 0; index < teamSeed.players.length; index += 1) {
      const [name, role, battingStyle, bowlingStyle] = teamSeed.players[index];
      const player = await Player.findOneAndUpdate(
        { playerId: `${teamSeed.teamId}-${index + 1}` },
        {
          $set: {
            name, role, battingStyle, bowlingStyle, teamId: team._id,
            jerseyNumber: index + 1, isSold: true, soldPrice: 1,
            battingRating: role === 'Bowler' ? 45 : 80,
            bowlingRating: role === 'Batter' || role === 'Wicketkeeper' ? 20 : 75
          },
          $setOnInsert: { playerId: `${teamSeed.teamId}-${index + 1}`, basePrice: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      playerIds.push(player._id);
      createdPlayers.push(player);
    }

    const captain = createdPlayers.find((player) => player.name === teamSeed.captain) || createdPlayers[0];
    const keeper = createdPlayers.find((player) => player.name === teamSeed.keeper) || createdPlayers.find((player) => player.role === 'Wicketkeeper');
    await Team.findByIdAndUpdate(team._id, { $set: { players: playerIds, captain: captain._id } });
    if (keeper && keeper.role !== 'Wicketkeeper') await Player.findByIdAndUpdate(keeper._id, { $set: { role: 'Wicketkeeper' } });
  }

  console.log(`Seeded ${iplTeams.length} IPL teams with ${iplTeams.length * 11} players.`);
};

if (require.main === module) {
  (async () => {
    await connectDB();
    await seedCricketData();
    await disconnectDB();
    process.exit(0);
  })();
}

module.exports = { seedCricketData, iplTeams };
