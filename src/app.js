const cookieParser = require('cookie-parser');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { StudentProfile, User, Job, Application, EmailLog } = require('./models');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

app.use('/api/v1', routes);

const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use(errorHandler);

mongoose
  .connect(config.mongoUri)
  .then(async () => {
    await Promise.all([
      User.syncIndexes(),
      StudentProfile.syncIndexes(),
      Job.syncIndexes(),
      Application.syncIndexes(),
      EmailLog.syncIndexes(),
    ]);
  })
  .catch((error) => {
    console.error(error.message);
  });

module.exports = app;
