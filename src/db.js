const mongoose = require('mongoose');
const { Tenant, StudentProfile, User, Job, Application, EmailLog, AuditLog } = require('./models');
const config = require('./config');

let connectionPromise = null;

async function syncModelIndexes() {
  await Promise.all([
    Tenant.syncIndexes(),
    User.syncIndexes(),
    StudentProfile.syncIndexes(),
    Job.syncIndexes(),
    Application.syncIndexes(),
    EmailLog.syncIndexes(),
    AuditLog.syncIndexes(),
  ]);
}

async function connectDatabase(uri = config.mongoUri) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri).then(async (connection) => {
      await syncModelIndexes();
      return connection;
    });
  }

  try {
    return await connectionPromise;
  } finally {
    if (mongoose.connection.readyState !== 1) {
      connectionPromise = null;
    }
  }
}

async function disconnectDatabase() {
  connectionPromise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
