// Serverless function entry point for Vercel.
// Vercel expects serverless functions in /api/ at the project root.
// This file re-exports the Express app from backend/api/index.js
// so the same backend code is used both locally and on Vercel.
module.exports = require('../backend/api/index.js')
