const mongoose = require('mongoose');

const VALID_ROLES = [
  'admin',
  'team_owner',
  'scorer',
  'tournament_organizer',
  'spectator'
];

const roleSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role_type: {
      type: String,
      enum: VALID_ROLES,
      required: true
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assigned_at: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

roleSchema.index({ user_id: 1, role_type: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);

module.exports = { Role, VALID_ROLES };
