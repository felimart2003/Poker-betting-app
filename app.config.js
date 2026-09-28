const config = require('./app.json').expo;
module.exports = { ...config, experiments: { baseUrl: process.env.GITHUB_ACTIONS ? '/Poker-betting-app' : '' } };
