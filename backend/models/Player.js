const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Za-z ]+$/, 'Player name can contain only letters and spaces']
    },

    dob: {
      type: Date,
      required: true
    },

    age: {
      type: Number,
      required: true,
      min: 10,
      max: 80
    },

    role: {
      type: String,
      required: true,
      enum: ['Batter', 'Bowler', 'All-rounder', 'Wicketkeeper'],
      default: 'Batter'
    },

    battingStyle: {
      type: String,
      enum: ['Right Hand', 'Left Hand', 'Not Specified'],
      default: 'Not Specified'
    },

    bowlingStyle: {
      type: String,
      enum: [
        'Right Arm Fast',
        'Right Arm Medium Fast',
        'Right Arm Medium',
        'Right Arm Off Break',
        'Right Arm Leg Break',
        'Left Arm Fast',
        'Left Arm Medium Fast',
        'Left Arm Medium',
        'Left Arm Orthodox',
        'Left Arm Chinaman',
        'Not Specified'
      ],
      default: 'Not Specified'
    },

    jerseyNumber: {
      type: Number,
      min: 1,
      max: 99
    },

    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
    },

    battingRating: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },

    bowlingRating: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },

    basePrice: {
      type: Number,
      min: 0.1,
      max: 20,
      default: 0.5
    },

    soldPrice: {
      type: Number,
      default: null
    },

    isSold: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Player', playerSchema);