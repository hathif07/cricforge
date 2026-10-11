const Player = require('../models/Player');
const { connectDB, disconnectDB } = require('../config/db');

// Accurate date of birth mapping for IPL team squad players
const playerDobMap = {
  // CSK
  'Ruturaj Gaikwad': '1997-01-31',
  'MS Dhoni': '1981-07-07',
  'Devon Conway': '1991-07-08',
  'Shivam Dube': '1993-06-26',
  'Ravindra Jadeja': '1988-12-06',
  'Moeen Ali': '1987-06-18',
  'Daryl Mitchell': '1991-05-20',
  'Deepak Chahar': '1992-08-07',
  'Maheesh Theekshana': '2000-08-01',
  'Matheesha Pathirana': '2002-12-18',
  'Tushar Deshpande': '1995-05-15',

  // MI
  'Rohit Sharma': '1987-04-30',
  'Suryakumar Yadav': '1990-09-14',
  'Hardik Pandya': '1993-10-11',
  'Ishan Kishan': '1998-07-18',
  'Tilak Varma': '2002-11-08',
  'Tim David': '1996-08-16',
  'Naman Dhir': '1999-12-31',
  'Jasprit Bumrah': '1993-12-06',
  'Gerald Coetzee': '2000-10-02',
  'Piyush Chawla': '1988-12-24',
  'Akash Madhwal': '1993-11-25',

  // RCB
  'Faf du Plessis': '1984-07-13',
  'Virat Kohli': '1988-11-05',
  'Rajat Patidar': '1993-06-01',
  'Cameron Green': '1999-06-03',
  'Glenn Maxwell': '1988-10-14',
  'Dinesh Karthik': '1985-06-01',
  'Mahipal Lomror': '1999-11-16',
  'Mohammed Siraj': '1994-03-13',
  'Yash Dayal': '1997-12-13',
  'Reece Topley': '1994-02-21',
  'Karn Sharma': '1987-10-23',

  // KKR
  'Shreyas Iyer': '1994-12-06',
  'Phil Salt': '1996-08-28',
  'Sunil Narine': '1988-05-26',
  'Venkatesh Iyer': '1994-12-25',
  'Rinku Singh': '1997-10-12',
  'Andre Russell': '1988-04-29',
  'Ramandeep Singh': '1997-04-13',
  'Mitchell Starc': '1990-01-30',
  'Varun Chakravarthy': '1991-08-29',
  'Harshit Rana': '2001-12-22',
  'Vaibhav Arora': '1997-12-14',

  // SRH
  'Travis Head': '1993-12-29',
  'Abhishek Sharma': '2000-09-04',
  'Heinrich Klaasen': '1991-07-30',
  'Aiden Markram': '1994-10-04',
  'Nitish Reddy': '2003-05-26',
  'Rahul Tripathi': '1991-03-02',
  'Shahbaz Ahmed': '1994-12-12',
  'Pat Cummins': '1993-05-08',
  'Bhuvneshwar Kumar': '1990-02-05',
  'T Natarajan': '1991-04-04',
  'Mayank Markande': '1997-11-11',

  // RR
  'Yashasvi Jaiswal': '2001-12-28',
  'Jos Buttler': '1990-09-08',
  'Sanju Samson': '1994-11-11',
  'Shimron Hetmyer': '1996-12-26',
  'Riyan Parag': '2001-11-10',
  'Ravichandran Ashwin': '1986-09-17',
  'Dhruv Jurel': '2001-01-21',
  'Trent Boult': '1989-07-22',
  'Sandeep Sharma': '1993-05-18',
  'Yuzvendra Chahal': '1990-07-23',
  'Avesh Khan': '1996-12-13'
};

const normalizeBowlingStyle = (style) => {
  if (!style || style === 'Not Specified') return 'Not Specified';
  const s = String(style).toLowerCase();
  if (s.includes('right') && s.includes('fast') && !s.includes('medium')) return 'Right Arm Fast';
  if (s.includes('right') && s.includes('medium') && s.includes('fast')) return 'Right Arm Medium Fast';
  if (s.includes('right') && s.includes('medium')) return 'Right Arm Medium';
  if (s.includes('right') && (s.includes('off') || s.includes('spin'))) return 'Right Arm Off Break';
  if (s.includes('right') && s.includes('leg')) return 'Right Arm Leg Break';
  if (s.includes('left') && s.includes('fast') && !s.includes('medium')) return 'Left Arm Fast';
  if (s.includes('left') && s.includes('medium') && s.includes('fast')) return 'Left Arm Medium Fast';
  if (s.includes('left') && s.includes('medium')) return 'Left Arm Medium';
  if (s.includes('left') && (s.includes('orthodox') || s.includes('spin'))) return 'Left Arm Orthodox';
  if (s.includes('left') && s.includes('chinaman')) return 'Left Arm Chinaman';
  return 'Not Specified';
};

const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const updateExistingPlayerAges = async () => {
  console.log('Normalizing bowling styles and updating ages for all players...');

  const allPlayers = await Player.find({});
  let updatedCount = 0;

  for (const player of allPlayers) {
    let modified = false;

    // Normalize bowling style if it doesn't match enum
    const validStyles = [
      'Right Arm Fast', 'Right Arm Medium Fast', 'Right Arm Medium',
      'Right Arm Off Break', 'Right Arm Leg Break', 'Left Arm Fast',
      'Left Arm Medium Fast', 'Left Arm Medium', 'Left Arm Orthodox',
      'Left Arm Chinaman', 'Not Specified'
    ];
    if (!validStyles.includes(player.bowlingStyle)) {
      player.bowlingStyle = normalizeBowlingStyle(player.bowlingStyle);
      modified = true;
    }

    // Set age and dob if missing
    if (!player.age || !player.dob) {
      let dobString = playerDobMap[player.name];
      if (!dobString) {
        dobString = '1998-01-15';
      }

      const dob = new Date(dobString);
      const age = calculateAge(dob);

      player.dob = dob;
      player.age = age;
      modified = true;
    }

    // Set status field if missing
    if (!player.status) {
      player.status = player.isSold ? 'sold' : 'unsold';
      modified = true;
    }

    if (modified) {
      await player.save();
      updatedCount++;
    }
  }

  console.log(`Successfully normalized and updated ${updatedCount} players.`);

  const allAfter = await Player.find({});
  const missing = allAfter.filter(p => !p.age || !p.dob);
  console.log(`Players remaining without age/dob: ${missing.length}`);
};

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await updateExistingPlayerAges();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Update failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { updateExistingPlayerAges, playerDobMap, normalizeBowlingStyle, calculateAge };
