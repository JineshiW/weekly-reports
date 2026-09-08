const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');

// Validation schema for POST /register — enforces password length and email
// format before anything hits the database.
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['member', 'manager']).default('member'),
  jobTitle: z.string().optional(),
});

// Validation schema for POST /login. Password only checks presence here —
// the real check happens against the stored hash in login().
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Issues a signed JWT carrying the user's id and role, valid for 7 days.
function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

// Stores the JWT in an httpOnly cookie so it isn't accessible to client-side JS.
// secure is only enabled in production since local dev typically isn't HTTPS.
function setCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches token expiry
  });
}

// Creates a new account. Rejects duplicate emails, hashes the password before
// storing it, then signs the user in immediately (cookie + token in the response).
async function register(req, res, next) {
  try {
    const { name, email, password, role, jobTitle } = req.body;
    const taken = await User.findOne({ email });
    if (taken) return res.status(409).json({ message: 'That email is already registered' });

    const user = await User.create({
      name,
      email,
      role,
      jobTitle: jobTitle || '',
      passwordHash: await User.hashPassword(password),
    });

    const token = signToken(user);
    setCookie(res, token);
    res.status(201).json({ user: user.toPublic(), token });
  } catch (err) {
    next(err);
  }
}

// Authenticates an existing user. Uses the same generic error message for
// "no such user" and "wrong password" so login attempts can't be used to
// enumerate which emails are registered. Also rejects deactivated accounts.
async function login(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !user.active) return res.status(401).json({ message: 'Wrong email or password' });

    const matches = await user.checkPassword(req.body.password);
    if (!matches) return res.status(401).json({ message: 'Wrong email or password' });

    const token = signToken(user);
    setCookie(res, token);
    res.json({ user: user.toPublic(), token });
  } catch (err) {
    next(err);
  }
}

// Clears the auth cookie. Client-held copies of the token (if any) simply
// expire naturally after 7 days.
function logout(req, res) {
  res.clearCookie('token');
  res.json({ message: 'Signed out' });
}

// Returns the current authenticated user (req.user is expected to be
// populated by an earlier auth middleware).
function me(req, res) {
  res.json({ user: req.user.toPublic() });
}

module.exports = { register, login, logout, me, registerSchema, loginSchema };