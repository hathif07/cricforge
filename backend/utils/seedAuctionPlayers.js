const Player = require('../models/Player');
const { connectDB, disconnectDB } = require('../config/db');

// List of 250 real players from the latest IPL mega auction pool
const auctionPlayersData = [
  // --- Group 1: Marquee Indian Capped Players (50) ---
  { name: 'Rishabh Pant', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Not Specified', dob: '1997-10-04', jersey: 17, basePrice: 2.0, batRtg: 92, bowlRtg: 20 },
  { name: 'KL Rahul', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1992-04-18', jersey: 1, basePrice: 2.0, batRtg: 90, bowlRtg: 20 },
  { name: 'Mohammed Shami', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1990-09-03', jersey: 11, basePrice: 2.0, batRtg: 35, bowlRtg: 93 },
  { name: 'Arshdeep Singh', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Fast', dob: '1999-02-05', jersey: 2, basePrice: 2.0, batRtg: 30, bowlRtg: 91 },
  { name: 'Yuzvendra Chahal', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1990-07-23', jersey: 3, basePrice: 2.0, batRtg: 25, bowlRtg: 92 },
  { name: 'Washington Sundar', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Off Break', dob: '1999-10-05', jersey: 5, basePrice: 2.0, batRtg: 80, bowlRtg: 82 },
  { name: 'Shardul Thakur', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1991-10-16', jersey: 54, basePrice: 2.0, batRtg: 76, bowlRtg: 81 },
  { name: 'Harshal Patel', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1990-11-23', jersey: 8, basePrice: 2.0, batRtg: 55, bowlRtg: 89 },
  { name: 'Prasidh Krishna', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-02-19', jersey: 24, basePrice: 2.0, batRtg: 25, bowlRtg: 86 },
  { name: 'Mukesh Kumar', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1993-10-15', jersey: 49, basePrice: 2.0, batRtg: 25, bowlRtg: 84 },
  { name: 'Devdutt Padikkal', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Off Break', dob: '2000-07-07', jersey: 19, basePrice: 2.0, batRtg: 83, bowlRtg: 30 },
  { name: 'Prithvi Shaw', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1999-11-09', jersey: 10, basePrice: 1.5, batRtg: 84, bowlRtg: 25 },
  { name: 'Sarfaraz Khan', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1997-10-22', jersey: 97, basePrice: 1.0, batRtg: 85, bowlRtg: 30 },
  { name: 'Manish Pandey', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1989-09-10', jersey: 9, basePrice: 1.0, batRtg: 79, bowlRtg: 25 },
  { name: 'Karun Nair', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1991-12-06', jersey: 69, basePrice: 0.75, batRtg: 78, bowlRtg: 25 },
  { name: 'Ajinkya Rahane', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1988-06-06', jersey: 27, basePrice: 1.5, batRtg: 83, bowlRtg: 30 },
  { name: 'Mayank Agarwal', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1991-02-16', jersey: 16, basePrice: 1.5, batRtg: 81, bowlRtg: 25 },
  { name: 'Deepak Hooda', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1995-04-19', jersey: 6, basePrice: 1.5, batRtg: 78, bowlRtg: 72 },
  { name: 'Krunal Pandya', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1991-03-24', jersey: 25, basePrice: 2.0, batRtg: 79, bowlRtg: 82 },
  { name: 'Vijay Shankar', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1991-01-26', jersey: 59, basePrice: 1.0, batRtg: 76, bowlRtg: 70 },
  { name: 'Shivam Mavi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1998-11-26', jersey: 26, basePrice: 1.0, batRtg: 45, bowlRtg: 81 },
  { name: 'Kamlesh Nagarkoti', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1999-12-28', jersey: 55, basePrice: 0.5, batRtg: 40, bowlRtg: 78 },
  { name: 'Kartik Tyagi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '2000-11-08', jersey: 99, basePrice: 0.75, batRtg: 30, bowlRtg: 80 },
  { name: 'Umesh Yadav', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1987-10-25', jersey: 18, basePrice: 1.5, batRtg: 45, bowlRtg: 82 },
  { name: 'Ishant Sharma', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1988-09-02', jersey: 70, basePrice: 1.0, batRtg: 25, bowlRtg: 81 },
  { name: 'Jaydev Unadkat', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Medium Fast', dob: '1991-10-18', jersey: 33, basePrice: 1.0, batRtg: 45, bowlRtg: 80 },
  { name: 'Chetan Sakariya', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Medium Fast', dob: '1998-02-28', jersey: 56, basePrice: 0.75, batRtg: 30, bowlRtg: 79 },
  { name: 'Kuldeep Sen', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-10-22', jersey: 82, basePrice: 0.5, batRtg: 25, bowlRtg: 79 },
  { name: 'Umran Malik', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1999-11-22', jersey: 21, basePrice: 1.5, batRtg: 25, bowlRtg: 85 },
  { name: 'Ravi Bishnoi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '2000-09-05', jersey: 57, basePrice: 2.0, batRtg: 30, bowlRtg: 88 },
  { name: 'Rahul Chahar', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1999-08-04', jersey: 28, basePrice: 1.5, batRtg: 35, bowlRtg: 83 },
  { name: 'Shahrukh Khan', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1995-05-27', jersey: 35, basePrice: 1.5, batRtg: 82, bowlRtg: 40 },
  { name: 'Sai Kishore', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1996-11-06', jersey: 88, basePrice: 1.0, batRtg: 40, bowlRtg: 84 },
  { name: 'Sai Sudharsan', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Leg Break', dob: '2001-10-15', jersey: 23, basePrice: 1.5, batRtg: 86, bowlRtg: 35 },
  { name: 'Jitesh Sharma', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1993-10-22', jersey: 96, basePrice: 1.5, batRtg: 83, bowlRtg: 20 },
  { name: 'Prabhsimran Singh', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '2000-08-10', jersey: 84, basePrice: 1.0, batRtg: 82, bowlRtg: 20 },
  { name: 'Anuj Rawat', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Not Specified', dob: '1999-10-17', jersey: 72, basePrice: 0.5, batRtg: 77, bowlRtg: 20 },
  { name: 'Srikar Bharat', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1993-10-03', jersey: 14, basePrice: 0.75, batRtg: 78, bowlRtg: 20 },
  { name: 'Harpreet Brar', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1995-09-16', jersey: 95, basePrice: 1.0, batRtg: 70, bowlRtg: 81 },
  { name: 'Shahbaz Nadeem', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1989-08-12', jersey: 89, basePrice: 0.5, batRtg: 35, bowlRtg: 76 },
  { name: 'Mohit Sharma', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1988-09-18', jersey: 12, basePrice: 1.5, batRtg: 35, bowlRtg: 85 },
  { name: 'Sandeep Warrier', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1991-04-04', jersey: 67, basePrice: 0.5, batRtg: 25, bowlRtg: 77 },
  { name: 'Anukul Roy', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1998-11-30', jersey: 48, basePrice: 0.5, batRtg: 68, bowlRtg: 76 },
  { name: 'Khaleel Ahmed', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '1997-12-01', jersey: 71, basePrice: 1.5, batRtg: 25, bowlRtg: 85 },
  { name: 'Mayank Yadav', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '2002-06-17', jersey: 15, basePrice: 1.5, batRtg: 25, bowlRtg: 88 },
  { name: 'Rasikh Salam', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '2000-04-05', jersey: 68, basePrice: 0.5, batRtg: 30, bowlRtg: 79 },
  { name: 'Ashutosh Sharma', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1998-09-15', jersey: 43, basePrice: 1.0, batRtg: 83, bowlRtg: 35 },
  { name: 'Shashank Singh', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1991-11-21', jersey: 44, basePrice: 1.0, batRtg: 84, bowlRtg: 45 },
  { name: 'Nehal Wadhera', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Leg Break', dob: '2000-09-04', jersey: 62, basePrice: 1.0, batRtg: 82, bowlRtg: 40 },
  { name: 'Abishek Porel', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Not Specified', dob: '2002-10-17', jersey: 51, basePrice: 1.0, batRtg: 81, bowlRtg: 20 },

  // --- Group 2: Premier Overseas Stars (50) ---
  { name: 'David Warner', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1986-10-27', jersey: 31, basePrice: 2.0, batRtg: 91, bowlRtg: 30 },
  { name: 'Steve Smith', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1989-06-02', jersey: 49, basePrice: 2.0, batRtg: 89, bowlRtg: 40 },
  { name: 'Kane Williamson', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1990-08-08', jersey: 22, basePrice: 2.0, batRtg: 88, bowlRtg: 35 },
  { name: 'Quinton de Kock', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Not Specified', dob: '1992-12-17', jersey: 12, basePrice: 2.0, batRtg: 90, bowlRtg: 20 },
  { name: 'Liam Livingstone', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1993-08-04', jersey: 29, basePrice: 2.0, batRtg: 88, bowlRtg: 78 },
  { name: 'Sam Curran', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Medium Fast', dob: '1998-06-03', jersey: 58, basePrice: 2.0, batRtg: 82, bowlRtg: 86 },
  { name: 'Kagiso Rabada', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Fast', dob: '1995-05-25', jersey: 25, basePrice: 2.0, batRtg: 40, bowlRtg: 92 },
  { name: 'Marcus Stoinis', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1989-08-16', jersey: 17, basePrice: 2.0, batRtg: 86, bowlRtg: 79 },
  { name: 'Mitchell Marsh', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1991-10-20', jersey: 8, basePrice: 2.0, batRtg: 87, bowlRtg: 77 },
  { name: 'David Miller', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Off Break', dob: '1989-06-10', jersey: 10, basePrice: 2.0, batRtg: 89, bowlRtg: 25 },
  { name: 'Nicholas Pooran', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Off Break', dob: '1995-10-02', jersey: 29, basePrice: 2.0, batRtg: 92, bowlRtg: 25 },
  { name: 'Rovman Powell', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1993-07-23', jersey: 52, basePrice: 1.5, batRtg: 84, bowlRtg: 60 },
  { name: 'Wanindu Hasaranga', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1997-07-29', jersey: 49, basePrice: 2.0, batRtg: 76, bowlRtg: 90 },
  { name: 'Dilshan Madushanka', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '2000-09-18', jersey: 98, basePrice: 1.0, batRtg: 25, bowlRtg: 83 },
  { name: 'Nuwan Thushara', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1994-08-06', jersey: 77, basePrice: 1.0, batRtg: 25, bowlRtg: 82 },
  { name: 'Dushmantha Chameera', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1992-01-11', jersey: 5, basePrice: 1.0, batRtg: 30, bowlRtg: 81 },
  { name: 'Marco Jansen', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '2000-05-01', jersey: 70, basePrice: 2.0, batRtg: 78, bowlRtg: 87 },
  { name: 'Anrich Nortje', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1993-11-16', jersey: 20, basePrice: 2.0, batRtg: 25, bowlRtg: 90 },
  { name: 'Lungi Ngidi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-03-29', jersey: 22, basePrice: 1.5, batRtg: 25, bowlRtg: 84 },
  { name: 'Keshav Maharaj', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1990-02-07', jersey: 16, basePrice: 1.0, batRtg: 45, bowlRtg: 84 },
  { name: 'Tabraiz Shamsi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Chinaman', dob: '1990-02-18', jersey: 68, basePrice: 1.0, batRtg: 20, bowlRtg: 83 },
  { name: 'Nandre Burger', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Fast', dob: '1995-08-11', jersey: 74, basePrice: 1.0, batRtg: 25, bowlRtg: 84 },
  { name: 'Rassie van der Dussen', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1989-02-07', jersey: 72, basePrice: 1.5, batRtg: 84, bowlRtg: 30 },
  { name: 'Ryan Rickelton', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Not Specified', dob: '1996-07-11', jersey: 44, basePrice: 1.0, batRtg: 82, bowlRtg: 20 },
  { name: 'Tristan Stubbs', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2000-08-14', jersey: 30, basePrice: 2.0, batRtg: 88, bowlRtg: 60 },
  { name: 'Dewald Brevis', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '2003-04-29', jersey: 17, basePrice: 1.0, batRtg: 81, bowlRtg: 65 },
  { name: 'Donovan Ferreira', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1998-07-21', jersey: 55, basePrice: 0.75, batRtg: 78, bowlRtg: 65 },
  { name: 'Wiaan Mulder', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1998-02-19', jersey: 13, basePrice: 1.0, batRtg: 77, bowlRtg: 76 },
  { name: 'Josh Hazlewood', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Fast', dob: '1991-01-08', jersey: 38, basePrice: 2.0, batRtg: 30, bowlRtg: 92 },
  { name: 'Spencer Johnson', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Fast', dob: '1995-12-16', jersey: 45, basePrice: 1.5, batRtg: 25, bowlRtg: 84 },
  { name: 'Jhye Richardson', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-07-24', jersey: 60, basePrice: 1.5, batRtg: 40, bowlRtg: 83 },
  { name: 'Lance Morris', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1998-03-28', jersey: 28, basePrice: 0.75, batRtg: 20, bowlRtg: 82 },
  { name: 'Nathan Ellis', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1994-09-22', jersey: 7, basePrice: 1.5, batRtg: 35, bowlRtg: 86 },
  { name: 'Sean Abbott', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1992-02-29', jersey: 77, basePrice: 1.5, batRtg: 73, bowlRtg: 82 },
  { name: 'Daniel Sams', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '1992-10-27', jersey: 66, basePrice: 1.0, batRtg: 75, bowlRtg: 80 },
  { name: 'Ashton Agar', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1993-10-14', jersey: 46, basePrice: 1.0, batRtg: 72, bowlRtg: 81 },
  { name: 'Adam Zampa', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1992-03-31', jersey: 88, basePrice: 2.0, batRtg: 25, bowlRtg: 89 },
  { name: 'Matthew Wade', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Medium', dob: '1987-12-26', jersey: 13, basePrice: 1.0, batRtg: 81, bowlRtg: 20 },
  { name: 'Josh Inglis', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1995-03-04', jersey: 48, basePrice: 2.0, batRtg: 86, bowlRtg: 20 },
  { name: 'Jason Behrendorff', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '1990-04-20', jersey: 65, basePrice: 1.5, batRtg: 25, bowlRtg: 83 },
  { name: 'Riley Meredith', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-06-21', jersey: 34, basePrice: 1.0, batRtg: 20, bowlRtg: 82 },
  { name: 'Harry Brook', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1999-02-22', jersey: 88, basePrice: 2.0, batRtg: 89, bowlRtg: 40 },
  { name: 'Jonny Bairstow', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1989-09-26', jersey: 51, basePrice: 2.0, batRtg: 88, bowlRtg: 20 },
  { name: 'Will Jacks', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1998-11-21', jersey: 91, basePrice: 2.0, batRtg: 87, bowlRtg: 75 },
  { name: 'Gus Atkinson', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1998-12-19', jersey: 37, basePrice: 2.0, batRtg: 45, bowlRtg: 86 },
  { name: 'Tom Curran', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1995-03-12', jersey: 59, basePrice: 1.5, batRtg: 74, bowlRtg: 80 },
  { name: 'Chris Jordan', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1988-10-04', jersey: 34, basePrice: 1.5, batRtg: 62, bowlRtg: 82 },
  { name: 'Tymal Mills', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '1992-08-12', jersey: 72, basePrice: 1.0, batRtg: 20, bowlRtg: 82 },
  { name: 'Luke Wood', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Fast', dob: '1995-08-02', jersey: 85, basePrice: 0.75, batRtg: 40, bowlRtg: 80 },
  { name: 'Chris Woakes', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1989-03-02', jersey: 19, basePrice: 2.0, batRtg: 77, bowlRtg: 85 },

  // --- Group 3: Emerging & Uncapped Indian Talents (50) ---
  { name: 'Yash Dhull', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2002-11-11', jersey: 33, basePrice: 0.5, batRtg: 79, bowlRtg: 30 },
  { name: 'Angkrish Raghuvanshi', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '2005-06-05', jersey: 18, basePrice: 0.5, batRtg: 80, bowlRtg: 40 },
  { name: 'Sameer Rizvi', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2003-12-06', jersey: 7, basePrice: 1.0, batRtg: 81, bowlRtg: 35 },
  { name: 'Kumar Kushagra', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '2004-10-23', jersey: 63, basePrice: 0.5, batRtg: 78, bowlRtg: 20 },
  { name: 'Robin Minz', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Not Specified', dob: '2002-09-13', jersey: 21, basePrice: 0.5, batRtg: 77, bowlRtg: 20 },
  { name: 'Swastik Chikara', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2005-04-03', jersey: 44, basePrice: 0.3, batRtg: 76, bowlRtg: 30 },
  { name: 'Suyash Sharma', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '2003-05-15', jersey: 94, basePrice: 0.75, batRtg: 25, bowlRtg: 82 },
  { name: 'Rohan Kunnummal', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1998-05-10', jersey: 31, basePrice: 0.3, batRtg: 75, bowlRtg: 25 },
  { name: 'Priyansh Arya', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Off Break', dob: '2001-01-18', jersey: 9, basePrice: 0.3, batRtg: 77, bowlRtg: 25 },
  { name: 'Ayush Badoni', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1999-12-03', jersey: 2, basePrice: 1.0, batRtg: 82, bowlRtg: 60 },
  { name: 'Arshin Kulkarni', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '2005-02-15', jersey: 27, basePrice: 0.5, batRtg: 78, bowlRtg: 76 },
  { name: 'Musheer Khan', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '2005-02-27', jersey: 97, basePrice: 0.5, batRtg: 82, bowlRtg: 78 },
  { name: 'Urvil Patel', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1998-10-17', jersey: 86, basePrice: 0.3, batRtg: 76, bowlRtg: 20 },
  { name: 'Vishnu Vinod', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1993-12-02', jersey: 23, basePrice: 0.5, batRtg: 77, bowlRtg: 20 },
  { name: 'Sheldon Jackson', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1986-09-27', jersey: 77, basePrice: 0.5, batRtg: 75, bowlRtg: 20 },
  { name: 'Upendra Yadav', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1996-10-08', jersey: 12, basePrice: 0.3, batRtg: 74, bowlRtg: 25 },
  { name: 'Baba Indrajith', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1994-07-08', jersey: 11, basePrice: 0.5, batRtg: 77, bowlRtg: 35 },
  { name: 'Ricky Bhui', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1996-09-29', jersey: 53, basePrice: 0.5, batRtg: 78, bowlRtg: 30 },
  { name: 'Priyam Garg', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '2000-11-30', jersey: 73, basePrice: 0.5, batRtg: 76, bowlRtg: 25 },
  { name: 'Virat Singh', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1997-12-08', jersey: 42, basePrice: 0.5, batRtg: 75, bowlRtg: 25 },
  { name: 'Mandeep Singh', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1991-12-18', jersey: 81, basePrice: 0.75, batRtg: 76, bowlRtg: 30 },
  { name: 'Hanuma Vihari', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1993-10-13', jersey: 64, basePrice: 0.75, batRtg: 78, bowlRtg: 45 },
  { name: 'Jalaj Saxena', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1986-12-15', jersey: 61, basePrice: 0.5, batRtg: 74, bowlRtg: 81 },
  { name: 'Shams Mulani', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1997-03-13', jersey: 36, basePrice: 0.5, batRtg: 73, bowlRtg: 80 },
  { name: 'Tanush Kotian', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1998-10-16', jersey: 89, basePrice: 0.5, batRtg: 75, bowlRtg: 80 },
  { name: 'Sanvir Singh', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1996-10-12', jersey: 78, basePrice: 0.3, batRtg: 74, bowlRtg: 72 },
  { name: 'Vivrant Sharma', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1999-10-30', jersey: 57, basePrice: 0.5, batRtg: 76, bowlRtg: 70 },
  { name: 'Prerak Mankad', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1994-03-23', jersey: 46, basePrice: 0.3, batRtg: 75, bowlRtg: 72 },
  { name: 'Atharva Taide', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '2000-04-26', jersey: 26, basePrice: 0.5, batRtg: 78, bowlRtg: 50 },
  { name: 'Harpreet Singh Bhatia', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Medium', dob: '1991-08-11', jersey: 15, basePrice: 0.5, batRtg: 76, bowlRtg: 30 },
  { name: 'Himanshu Rana', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1998-10-01', jersey: 39, basePrice: 0.3, batRtg: 74, bowlRtg: 25 },
  { name: 'Akshdeep Nath', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1993-05-10', jersey: 51, basePrice: 0.3, batRtg: 73, bowlRtg: 35 },
  { name: 'Subhranshu Senapati', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1996-12-30', jersey: 85, basePrice: 0.3, batRtg: 74, bowlRtg: 25 },
  { name: 'Ripal Patel', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1995-09-28', jersey: 32, basePrice: 0.3, batRtg: 73, bowlRtg: 68 },
  { name: 'Lalit Yadav', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1997-01-03', jersey: 19, basePrice: 0.75, batRtg: 75, bowlRtg: 77 },
  { name: 'Praveen Dubey', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1993-03-17', jersey: 41, basePrice: 0.3, batRtg: 68, bowlRtg: 76 },
  { name: 'Manav Suthar', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '2002-08-03', jersey: 66, basePrice: 0.5, batRtg: 45, bowlRtg: 81 },
  { name: 'Vicky Ostwal', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '2002-09-01', jersey: 87, basePrice: 0.3, batRtg: 35, bowlRtg: 78 },
  { name: 'Hrithik Shokeen', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2000-08-14', jersey: 28, basePrice: 0.5, batRtg: 72, bowlRtg: 76 },
  { name: 'Murugan Ashwin', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1990-09-08', jersey: 83, basePrice: 0.5, batRtg: 30, bowlRtg: 79 },
  { name: 'KC Cariappa', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1994-04-13', jersey: 92, basePrice: 0.3, batRtg: 25, bowlRtg: 77 },
  { name: 'Shreyas Gopal', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1993-09-04', jersey: 74, basePrice: 0.75, batRtg: 72, bowlRtg: 80 },
  { name: 'Siddharth Kaul', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1990-05-19', jersey: 71, basePrice: 0.75, batRtg: 30, bowlRtg: 78 },
  { name: 'Varun Aaron', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1989-10-29', jersey: 79, basePrice: 0.5, batRtg: 25, bowlRtg: 78 },
  { name: 'Barinder Sran', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Medium Fast', dob: '1992-12-10', jersey: 84, basePrice: 0.3, batRtg: 25, bowlRtg: 75 },
  { name: 'Basil Thampi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1993-09-11', jersey: 37, basePrice: 0.5, batRtg: 25, bowlRtg: 77 },
  { name: 'KM Asif', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1993-07-24', jersey: 47, basePrice: 0.3, batRtg: 25, bowlRtg: 76 },
  { name: 'Simarjeet Singh', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1998-01-17', jersey: 65, basePrice: 0.5, batRtg: 30, bowlRtg: 79 },
  { name: 'Yash Thakur', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1998-12-28', jersey: 93, basePrice: 1.0, batRtg: 30, bowlRtg: 83 },
  { name: 'Vidwath Kaverappa', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1993-02-25', jersey: 56, basePrice: 0.5, batRtg: 25, bowlRtg: 80 },

  // --- Group 4: International T20 Specialists (50) ---
  { name: 'Finn Allen', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1999-04-22', jersey: 13, basePrice: 1.5, batRtg: 86, bowlRtg: 30 },
  { name: 'Glenn Phillips', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1996-12-06', jersey: 6, basePrice: 2.0, batRtg: 87, bowlRtg: 76 },
  { name: 'Michael Bracewell', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Off Break', dob: '1991-02-14', jersey: 4, basePrice: 1.0, batRtg: 81, bowlRtg: 79 },
  { name: 'Matt Henry', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1991-12-14', jersey: 21, basePrice: 1.5, batRtg: 35, bowlRtg: 88 },
  { name: 'Lockie Ferguson', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1991-06-13', jersey: 69, basePrice: 2.0, batRtg: 30, bowlRtg: 89 },
  { name: 'Adam Milne', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1992-04-13', jersey: 20, basePrice: 1.0, batRtg: 30, bowlRtg: 82 },
  { name: 'Ish Sodhi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1992-10-31', jersey: 61, basePrice: 1.0, batRtg: 35, bowlRtg: 84 },
  { name: 'Tim Southee', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1988-12-11', jersey: 38, basePrice: 1.5, batRtg: 55, bowlRtg: 84 },
  { name: 'Colin Munro', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Medium', dob: '1987-03-11', jersey: 82, basePrice: 1.0, batRtg: 83, bowlRtg: 40 },
  { name: 'James Neesham', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1990-09-17', jersey: 50, basePrice: 1.5, batRtg: 82, bowlRtg: 78 },
  { name: 'Mitchell Santner', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1992-02-05', jersey: 74, basePrice: 2.0, batRtg: 78, bowlRtg: 88 },
  { name: 'Kyle Jamieson', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1994-12-30', jersey: 12, basePrice: 1.0, batRtg: 68, bowlRtg: 82 },
  { name: 'Shakib Al Hasan', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1987-03-24', jersey: 75, basePrice: 1.5, batRtg: 85, bowlRtg: 88 },
  { name: 'Mustafizur Rahman', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Fast', dob: '1995-09-06', jersey: 90, basePrice: 2.0, batRtg: 20, bowlRtg: 89 },
  { name: 'Taskin Ahmed', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Fast', dob: '1995-04-03', jersey: 3, basePrice: 1.0, batRtg: 25, bowlRtg: 84 },
  { name: 'Shoriful Islam', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Fast', dob: '2001-06-03', jersey: 47, basePrice: 0.75, batRtg: 25, bowlRtg: 82 },
  { name: 'Litton Das', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1994-10-13', jersey: 16, basePrice: 1.0, batRtg: 83, bowlRtg: 20 },
  { name: 'Towhid Hridoy', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2000-12-04', jersey: 67, basePrice: 0.75, batRtg: 81, bowlRtg: 30 },
  { name: 'Rashid Khan', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1998-09-20', jersey: 19, basePrice: 2.0, batRtg: 80, bowlRtg: 96 },
  { name: 'Noor Ahmad', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Chinaman', dob: '2005-01-03', jersey: 15, basePrice: 2.0, batRtg: 25, bowlRtg: 89 },
  { name: 'Fazalhaq Farooqi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '2000-09-22', jersey: 83, basePrice: 1.5, batRtg: 20, bowlRtg: 86 },
  { name: 'Naveen Ul Haq', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1999-09-23', jersey: 78, basePrice: 1.5, batRtg: 30, bowlRtg: 86 },
  { name: 'Azmatullah Omarzai', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '2000-03-24', jersey: 54, basePrice: 1.5, batRtg: 83, bowlRtg: 84 },
  { name: 'Mohammad Nabi', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1985-01-01', jersey: 7, basePrice: 1.5, batRtg: 80, bowlRtg: 83 },
  { name: 'Mujeeb Ur Rahman', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2001-03-28', jersey: 88, basePrice: 1.5, batRtg: 25, bowlRtg: 86 },
  { name: 'Rahmanullah Gurbaz', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '2001-11-28', jersey: 21, basePrice: 2.0, batRtg: 87, bowlRtg: 20 },
  { name: 'Gulbadin Naib', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1991-03-16', jersey: 92, basePrice: 1.0, batRtg: 79, bowlRtg: 78 },
  { name: 'Karim Janat', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1998-08-11', jersey: 11, basePrice: 0.5, batRtg: 74, bowlRtg: 75 },
  { name: 'Qais Ahmad', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '2000-08-15', jersey: 32, basePrice: 0.5, batRtg: 35, bowlRtg: 79 },
  { name: 'Sikandar Raza', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1986-04-24', jersey: 24, basePrice: 1.5, batRtg: 85, bowlRtg: 84 },
  { name: 'Blessing Muzarabani', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-10-02', jersey: 40, basePrice: 0.75, batRtg: 25, bowlRtg: 83 },
  { name: 'Richard Ngarava', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Fast', dob: '1997-12-28', jersey: 48, basePrice: 0.75, batRtg: 30, bowlRtg: 82 },
  { name: 'Joshua Little', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '1999-11-01', jersey: 82, basePrice: 1.0, batRtg: 25, bowlRtg: 83 },
  { name: 'Mark Adair', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-03-27', jersey: 32, basePrice: 0.75, batRtg: 75, bowlRtg: 82 },
  { name: 'Paul Stirling', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1990-09-03', jersey: 1, basePrice: 0.75, batRtg: 83, bowlRtg: 45 },
  { name: 'Curtis Campher', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1999-04-20', jersey: 64, basePrice: 0.75, batRtg: 78, bowlRtg: 79 },
  { name: 'Harry Tector', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1999-12-06', jersey: 13, basePrice: 0.75, batRtg: 82, bowlRtg: 45 },
  { name: 'Lorcan Tucker', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1996-09-10', jersey: 3, basePrice: 0.5, batRtg: 79, bowlRtg: 20 },
  { name: 'Bas de Leede', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1999-11-15', jersey: 5, basePrice: 0.75, batRtg: 81, bowlRtg: 82 },
  { name: 'Logan van Beek', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1990-09-07', jersey: 17, basePrice: 0.75, batRtg: 77, bowlRtg: 81 },
  { name: 'Paul van Meekeren', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1993-01-15', jersey: 47, basePrice: 0.5, batRtg: 25, bowlRtg: 81 },
  { name: 'Scott Edwards', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1996-08-23', jersey: 37, basePrice: 0.75, batRtg: 80, bowlRtg: 20 },
  { name: 'Roelof van der Merwe', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1984-12-31', jersey: 52, basePrice: 0.5, batRtg: 73, bowlRtg: 80 },
  { name: 'Max ODowd', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1994-03-04', jersey: 4, basePrice: 0.5, batRtg: 78, bowlRtg: 30 },
  { name: 'Aryan Dutt', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2003-05-12', jersey: 88, basePrice: 0.5, batRtg: 40, bowlRtg: 80 },
  { name: 'Brandon McMullen', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1999-10-18', jersey: 29, basePrice: 0.5, batRtg: 80, bowlRtg: 79 },
  { name: 'George Munsey', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Medium', dob: '1993-02-21', jersey: 93, basePrice: 0.5, batRtg: 80, bowlRtg: 25 },
  { name: 'Brad Wheal', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-08-28', jersey: 58, basePrice: 0.5, batRtg: 25, bowlRtg: 80 },
  { name: 'Michael Leask', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1990-10-29', jersey: 28, basePrice: 0.5, batRtg: 78, bowlRtg: 76 },
  { name: 'Chris Sole', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1994-02-27', jersey: 71, basePrice: 0.5, batRtg: 20, bowlRtg: 81 },

  // --- Group 5: Global Franchise & Associate Stars (50) ---
  { name: 'Saurabh Netravalkar', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '1991-10-16', jersey: 23, basePrice: 0.75, batRtg: 35, bowlRtg: 86 },
  { name: 'Monank Patel', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1993-05-01', jersey: 1, basePrice: 0.5, batRtg: 80, bowlRtg: 20 },
  { name: 'Aaron Jones', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1994-10-19', jersey: 10, basePrice: 0.75, batRtg: 82, bowlRtg: 30 },
  { name: 'Corey Anderson', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Medium Fast', dob: '1990-12-13', jersey: 78, basePrice: 1.0, batRtg: 81, bowlRtg: 74 },
  { name: 'Harmeet Singh', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1992-09-07', jersey: 27, basePrice: 0.5, batRtg: 75, bowlRtg: 80 },
  { name: 'Ali Khan', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1990-12-13', jersey: 99, basePrice: 0.5, batRtg: 20, bowlRtg: 82 },
  { name: 'Andries Gous', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1993-11-24', jersey: 88, basePrice: 0.5, batRtg: 80, bowlRtg: 20 },
  { name: 'Shayan Jahangir', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1994-12-24', jersey: 5, basePrice: 0.3, batRtg: 75, bowlRtg: 20 },
  { name: 'Jasdeep Singh', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1993-02-10', jersey: 13, basePrice: 0.3, batRtg: 30, bowlRtg: 76 },
  { name: 'Nosthush Kenjige', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1991-03-02', jersey: 64, basePrice: 0.3, batRtg: 25, bowlRtg: 78 },
  { name: 'Ruben Trumpelmann', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '1998-02-01', jersey: 22, basePrice: 0.5, batRtg: 60, bowlRtg: 83 },
  { name: 'Gerhard Erasmus', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1995-04-11', jersey: 7, basePrice: 0.75, batRtg: 82, bowlRtg: 80 },
  { name: 'David Wiese', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1985-05-18', jersey: 96, basePrice: 1.0, batRtg: 80, bowlRtg: 81 },
  { name: 'Bernard Scholtz', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1990-10-03', jersey: 4, basePrice: 0.5, batRtg: 35, bowlRtg: 82 },
  { name: 'JJ Smit', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Medium Fast', dob: '1995-11-10', jersey: 49, basePrice: 0.5, batRtg: 78, bowlRtg: 79 },
  { name: 'Jan Frylinck', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Medium Fast', dob: '1994-04-06', jersey: 14, basePrice: 0.5, batRtg: 76, bowlRtg: 78 },
  { name: 'Michael van Lingen', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Medium', dob: '1997-10-24', jersey: 8, basePrice: 0.3, batRtg: 77, bowlRtg: 50 },
  { name: 'Zane Green', role: 'Wicketkeeper', battingStyle: 'Left Hand', bowlingStyle: 'Not Specified', dob: '1996-10-11', jersey: 15, basePrice: 0.3, batRtg: 74, bowlRtg: 20 },
  { name: 'Tangeni Lungameni', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Medium Fast', dob: '1992-04-17', jersey: 33, basePrice: 0.3, batRtg: 20, bowlRtg: 76 },
  { name: 'Aqib Ilyas', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1992-09-05', jersey: 77, basePrice: 0.5, batRtg: 79, bowlRtg: 78 },
  { name: 'Zeeshan Maqsood', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1987-10-24', jersey: 12, basePrice: 0.5, batRtg: 77, bowlRtg: 79 },
  { name: 'Bilal Khan', role: 'Bowler', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Fast', dob: '1987-04-10', jersey: 68, basePrice: 0.5, batRtg: 20, bowlRtg: 82 },
  { name: 'Kashyap Prajapati', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1995-10-11', jersey: 86, basePrice: 0.3, batRtg: 76, bowlRtg: 30 },
  { name: 'Ayaan Khan', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1992-08-30', jersey: 9, basePrice: 0.3, batRtg: 74, bowlRtg: 75 },
  { name: 'Kaleemullah', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1990-12-24', jersey: 18, basePrice: 0.3, batRtg: 25, bowlRtg: 75 },
  { name: 'Muhammad Waseem', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1994-02-12', jersey: 11, basePrice: 0.75, batRtg: 84, bowlRtg: 45 },
  { name: 'Ali Naseer', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '2004-03-09', jersey: 44, basePrice: 0.5, batRtg: 78, bowlRtg: 78 },
  { name: 'Junaid Siddique', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1992-12-06', jersey: 20, basePrice: 0.5, batRtg: 20, bowlRtg: 80 },
  { name: 'Aayan Afzal Khan', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '2005-11-15', jersey: 49, basePrice: 0.5, batRtg: 77, bowlRtg: 81 },
  { name: 'Vriitya Aravind', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '2002-06-11', jersey: 81, basePrice: 0.5, batRtg: 80, bowlRtg: 20 },
  { name: 'Asif Khan', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1990-02-15', jersey: 53, basePrice: 0.3, batRtg: 78, bowlRtg: 25 },
  { name: 'Rohan Mustafa', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Off Break', dob: '1988-10-07', jersey: 3, basePrice: 0.5, batRtg: 75, bowlRtg: 77 },
  { name: 'Zahoor Khan', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1989-05-25', jersey: 35, basePrice: 0.3, batRtg: 20, bowlRtg: 77 },
  { name: 'Rohit Paudel', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2002-09-02', jersey: 17, basePrice: 0.5, batRtg: 81, bowlRtg: 55 },
  { name: 'Dipendra Singh Airee', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '2000-01-24', jersey: 77, basePrice: 0.75, batRtg: 84, bowlRtg: 82 },
  { name: 'Kushal Bhurtel', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Leg Break', dob: '1997-01-22', jersey: 14, basePrice: 0.5, batRtg: 79, bowlRtg: 45 },
  { name: 'Sompal Kami', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1996-02-02', jersey: 10, basePrice: 0.5, batRtg: 74, bowlRtg: 80 },
  { name: 'Karan KC', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1991-10-10', jersey: 33, basePrice: 0.5, batRtg: 72, bowlRtg: 80 },
  { name: 'Aasif Sheikh', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '2001-01-22', jersey: 9, basePrice: 0.5, batRtg: 79, bowlRtg: 20 },
  { name: 'Gulshan Jha', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '2005-02-17', jersey: 26, basePrice: 0.5, batRtg: 76, bowlRtg: 78 },
  { name: 'Lalit Rajbanshi', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1999-02-27', jersey: 28, basePrice: 0.3, batRtg: 20, bowlRtg: 79 },
  { name: 'Kushal Malla', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '2004-03-05', jersey: 45, basePrice: 0.5, batRtg: 80, bowlRtg: 75 },
  { name: 'Abinash Bohara', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium', dob: '1997-07-30', jersey: 59, basePrice: 0.3, batRtg: 20, bowlRtg: 78 },
  { name: 'Nicholas Kirton', role: 'Batter', battingStyle: 'Left Hand', bowlingStyle: 'Right Arm Off Break', dob: '1998-05-06', jersey: 16, basePrice: 0.5, batRtg: 80, bowlRtg: 40 },
  { name: 'Aaron Johnson', role: 'Batter', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Off Break', dob: '1991-03-16', jersey: 8, basePrice: 0.5, batRtg: 79, bowlRtg: 30 },
  { name: 'Kaleem Sana', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Left Arm Fast', dob: '1994-01-01', jersey: 91, basePrice: 0.5, batRtg: 25, bowlRtg: 81 },
  { name: 'Dillon Heyliger', role: 'All-rounder', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Medium Fast', dob: '1989-10-21', jersey: 21, basePrice: 0.5, batRtg: 74, bowlRtg: 80 },
  { name: 'Saad Bin Zafar', role: 'All-rounder', battingStyle: 'Left Hand', bowlingStyle: 'Left Arm Orthodox', dob: '1986-11-10', jersey: 32, basePrice: 0.5, batRtg: 73, bowlRtg: 80 },
  { name: 'Shreyas Movva', role: 'Wicketkeeper', battingStyle: 'Right Hand', bowlingStyle: 'Not Specified', dob: '1993-09-04', jersey: 6, basePrice: 0.3, batRtg: 75, bowlRtg: 20 },
  { name: 'Jeremy Gordon', role: 'Bowler', battingStyle: 'Right Hand', bowlingStyle: 'Right Arm Fast', dob: '1987-01-20', jersey: 19, basePrice: 0.3, batRtg: 20, bowlRtg: 78 }
];

const calculateAge = (dobString) => {
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const seedAuctionPlayers = async () => {
  console.log(`Starting seed of ${auctionPlayersData.length} unsold players from latest IPL auctions...`);

  if (auctionPlayersData.length !== 250) {
    console.warn(`Warning: Expected 250 players, but found ${auctionPlayersData.length}`);
  }

  const operations = [];

  for (let i = 0; i < auctionPlayersData.length; i++) {
    const p = auctionPlayersData[i];
    const paddedIndex = String(i + 1).padStart(3, '0');
    const playerId = `IPL-AUC-${paddedIndex}`;
    const age = calculateAge(p.dob);

    operations.push({
      updateOne: {
        filter: { playerId },
        update: {
          $set: {
            name: p.name,
            dob: new Date(p.dob),
            age,
            role: p.role,
            battingStyle: p.battingStyle,
            bowlingStyle: p.bowlingStyle,
            jerseyNumber: p.jersey,
            basePrice: p.basePrice,
            battingRating: p.batRtg,
            bowlingRating: p.bowlRtg,
            isSold: false,
            status: 'unsold',
            teamId: null,
            soldPrice: null
          },
          $setOnInsert: {
            playerId
          }
        },
        upsert: true
      }
    });
  }

  const result = await Player.bulkWrite(operations);
  console.log('Bulk write completed successfully:');
  console.log(`- Matched: ${result.matchedCount}`);
  console.log(`- Modified: ${result.modifiedCount}`);
  console.log(`- Upserted: ${result.upsertedCount}`);

  const totalUnsold = await Player.countDocuments({ isSold: false });
  console.log(`Total unsold players in database: ${totalUnsold}`);
};

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedAuctionPlayers();
      await disconnectDB();
      console.log('Auction players seeding complete.');
      process.exit(0);
    } catch (err) {
      console.error('Seeding failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedAuctionPlayers, auctionPlayersData };
