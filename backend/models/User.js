const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { VALID_ROLES } = require('./Role');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password_hash: {
      type: String,
      required: [true, 'Password is required']
    },
    roles: {
      type: [String],
      enum: VALID_ROLES,
      default: ['spectator'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A user must have at least one role'
      }
    },
    avatar_url: { type: String, default: '' },
    bio: { type: String, maxlength: [500, 'Bio cannot exceed 500 characters'], default: '' },
    phone: { type: String, default: '' },
    preferences: {
      favorite_team: { type: String, default: '' },
      favorite_player: { type: String, default: '' },
      notifications_enabled: { type: Boolean, default: true }
    },
    is_active: { type: Boolean, default: true },
    reset_password_token: { type: String, default: null },
    reset_password_expires: { type: Date, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password_hash;
  delete user.reset_password_token;
  delete user.reset_password_expires;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = { User };
