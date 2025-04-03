/**
 * Direct patch for Next.js interopRequireDefault helper
 * 
 * This is the corrected version that implements the missing "_" function
 * that's causing the "TypeError: _interop_require_default._ is not a function" error
 */

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

// Add the missing function that's causing the error
_interopRequireDefault._ = function(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
};

module.exports = _interopRequireDefault; 