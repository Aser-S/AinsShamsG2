/**
 * Authentication & RBAC middleware
 */

/**
 * Ensures the request has a valid, active session.
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  // API vs browser response
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  return res.redirect('/login');
}

/**
 * Factory: returns middleware that allows only the listed roles.
 * Usage: hasRole(['ADMIN', 'MANAGER'])
 */
function hasRole(roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Ensures a MANAGER or CASHIER can only access their own branch.
 * ADMIN passes through unrestricted.
 * Expects req.params.branchId or req.body.branch_id.
 */
function ownBranchOnly(req, res, next) {
  const { role, branch_id } = req.session.user;
  if (role === 'ADMIN') return next();

  const requested = parseInt(req.params.branchId || req.body.branch_id, 10);
  if (!requested || requested !== branch_id) {
    return res.status(403).json({ error: 'Forbidden. You can only access your own branch.' });
  }
  next();
}

module.exports = { isAuthenticated, hasRole, ownBranchOnly };
