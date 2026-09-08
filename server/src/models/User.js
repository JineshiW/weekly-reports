const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['member', 'manager'], default: 'member' },
    jobTitle: { type: String, default: '' },
    // Soft-delete flag — deactivated accounts are kept (not removed) so their
    // historical reports remain intact.
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compares a plaintext password against this user's stored hash.
userSchema.methods.checkPassword = function checkPassword(plainText) {
  return bcrypt.compare(plainText, this.passwordHash);
};

// Hashes a plaintext password for storage (used on register/invite).
userSchema.statics.hashPassword = function hashPassword(plainText) {
  return bcrypt.hash(plainText, 10);
};

// Strips sensitive/internal fields (passwordHash, mongoose internals) before
// sending a user back in an API response.
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    jobTitle: this.jobTitle,
    active: this.active,
  };
};

module.exports = mongoose.model('User', userSchema);