const { User } = require('../models/User');
const { Role, VALID_ROLES } = require('../models/Role');
const { AuditLog } = require('../models/AuditLog');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, avatar_url, preferences } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatar_url !== undefined) user.avatar_url = avatar_url.trim();
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    const updatedUser = await user.save();
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: { user: updatedUser } });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    user.password_hash = newPassword;
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_CHANGED',
      performed_by: user._id,
      target_user: user._id,
      details: { reason: 'User requested password change' }
    });

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role && VALID_ROLES.includes(role)) query.roles = role;
    if (status !== undefined && status !== '') query.is_active = status === 'active';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: { total: totalUsers, page: parseInt(page), pages: Math.ceil(totalUsers / parseInt(limit)), limit: parseInt(limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const isSelf = req.user._id.toString() === req.params.id;
    const isAdmin = req.user.roles.includes('admin');
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions to view another user profile' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRoles = async (req, res, next) => {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ success: false, message: 'Roles must be a non-empty array of valid roles' });
    }
    const invalidRoles = roles.filter((r) => !VALID_ROLES.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${VALID_ROLES.join(', ')}` });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const oldRoles = [...user.roles];
    user.roles = roles;
    await user.save();

    await Role.deleteMany({ user_id: user._id });
    const roleDocs = roles.map((r) => ({ user_id: user._id, role_type: r, assigned_by: req.user._id }));
    await Role.insertMany(roleDocs);

    await AuditLog.create({
      action: 'USER_ROLES_UPDATED',
      performed_by: req.user._id,
      target_user: user._id,
      details: { previous_roles: oldRoles, new_roles: roles }
    });

    res.status(200).json({ success: true, message: 'User roles updated successfully', data: { user } });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active boolean field is required' });
    }
    if (req.user._id.toString() === req.params.id && !is_active) {
      return res.status(400).json({ success: false, message: 'Administrators cannot deactivate their own active account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.is_active = is_active;
    await user.save();

    await AuditLog.create({
      action: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      performed_by: req.user._id,
      target_user: user._id,
      details: { is_active }
    });

    res.status(200).json({ success: true, message: `User successfully ${is_active ? 'activated' : 'deactivated'}`, data: { user } });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { action, limit = 50, page = 1 } = req.query;
    const query = {};
    if (action) query.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalLogs = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('performed_by', 'name email roles')
      .populate('target_user', 'name email roles')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { logs, pagination: { total: totalLogs, page: parseInt(page), pages: Math.ceil(totalLogs / parseInt(limit)), limit: parseInt(limit) } }
    });
  } catch (error) {
    next(error);
  }
};
