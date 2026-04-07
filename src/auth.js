import crypto from 'crypto';

/**
 * Simple password authentication
 * In production, use proper auth (JWT, OAuth, etc.)
 */

// Hash password with SHA256
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Verify password
export function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

// Generate session token
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Store active sessions (in-memory, will reset on server restart)
const sessions = new Map();

// Add session
export function createSession(token) {
  sessions.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  });
}

// Verify session
export function verifySession(token) {
  const session = sessions.get(token);
  if (!session) return false;
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  
  return true;
}

// Remove session
export function removeSession(token) {
  sessions.delete(token);
}

// Clean expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Clean every hour
