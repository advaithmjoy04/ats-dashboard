const cookieParser = require('cookie-parser');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const tenantMiddleware = require('./middleware/tenant');
const { originMatchesTenant } = require('./services/tenantService');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(tenantMiddleware);
app.use(
  cors((req, callback) => {
    return callback(null, {
      origin(origin, done) {
        if (!origin) {
          return done(null, true);
        }

        if (originMatchesTenant(origin, req.tenant, {
          frontendOrigin: config.frontendOrigin,
          appBaseDomain: config.appBaseDomain,
          nodeEnv: config.nodeEnv,
        })) {
          return done(null, true);
        }

        return done(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    );
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
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

module.exports = app;
