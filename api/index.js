const app = require('../src/app');
const { connectDatabase } = require('../src/db');

module.exports = async function handler(req, res) {
  await connectDatabase();
  return app(req, res);
};
