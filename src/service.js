const express = require('express');
const { authRouter, setAuthUser } = require('./routes/authRouter.js');
const orderRouter = require('./routes/orderRouter.js');
const franchiseRouter = require('./routes/franchiseRouter.js');
const metrics = require('./metrics.js');
const logger = require('./logger.js')
const version = require('./version.json');
const config = require('./config.js');

const app = express();
app.use((req, res, next) => {
  req.recvTime = performance.now();
  next();
})
app.use(express.json());
app.use(metrics.requestTracker.bind(metrics))
app.use(logger.httpLogger)
app.use(setAuthUser);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

let chaos = false

app.use((req, res, next) => {
  if (chaos && !req.path.includes('chaos') && !(req.path.includes('auth') && req.method === 'DELETE')) {
    if ((Math.random() * 100) > 33) {
      return res.status(503).json({msg: 'chaos'})
    }
  }
  next()
})

const apiRouter = express.Router();
app.use('/api', apiRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/order', orderRouter);
apiRouter.use('/franchise', franchiseRouter);

apiRouter.use('/docs', (req, res) => {
  res.json({
    version: version.version,
    endpoints: [...authRouter.endpoints, ...orderRouter.endpoints, ...franchiseRouter.endpoints],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
  metrics.sendRequestLatency(req)
});

app.get('/', (req, res) => {
  res.json({
    message: 'welcome to JWT Pizza',
    version: version.version,
  });
  metrics.sendRequestLatency(req)
});

app.use((req, res, next) => {
  chaos = req.chaos || false
  if (!res.headersSent) {
    next()
  }
})

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'unknown endpoint',
  });
  metrics.sendRequestLatency(req)
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
  res.status(err.statusCode ?? 500).json({ message: err.message, stack: err.stack });
  metrics.sendRequestLatency(req)
  next();
});

module.exports = app;
