import http from 'http';
import { Server } from 'socket.io';
import cluster from 'cluster';
import os from 'os';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';

const PORT = Number(env.PORT) || 5000;
const numCPUs = os.cpus().length;
const enableCluster = env.NODE_ENV === 'production' && process.env.ENABLE_CLUSTER === 'true';
const requestedWorkers = Number(process.env.WEB_CONCURRENCY || 1);
const workerCount = Number.isFinite(requestedWorkers) && requestedWorkers > 0
  ? Math.min(requestedWorkers, numCPUs)
  : 1;

if (cluster.isPrimary && enableCluster) {
  logger.info(`Primary ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  connectDB().then(() => {
    const server = http.createServer(app);
    // Optimized timeouts for VPS/cPanel
    server.keepAliveTimeout = 60000; // 60s keep-alive
    server.headersTimeout = 61000; // 61s headers
    server.requestTimeout = 25000; // 25s request (stricter)
    server.maxHeadersCount = 100; // Limit headers to prevent memory issues
    // Socket.IO optimized for VPS/cPanel
    const io = new Server(server, {
      cors: {
        origin: env.CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'], // WebSocket first (faster)
      maxHttpBufferSize: 1e6, // 1MB max buffer
      upgradeTimeout: 10000, // 10s upgrade timeout
      pingInterval: 25000, // 25s ping interval
      pingTimeout: 60000, // 60s ping timeout
    });

    // Connection limit middleware for resource-constrained environments
    let connectionCount = 0;
    const MAX_CONNECTIONS = 500;
    io.on('connection', (socket) => {
      connectionCount++;
      if (connectionCount > MAX_CONNECTIONS) {
        logger.warn(`Connection limit ${MAX_CONNECTIONS} exceeded, rejecting socket`);
        socket.disconnect(true);
        return;
      }
      logger.info(`Socket connected: ${socket.id} (${connectionCount}/${MAX_CONNECTIONS})`);
      
      socket.on('join_branch', (branchId) => {
        socket.join(`branch:${branchId}`);
        logger.info(`Socket ${socket.id} joined branch: ${branchId}`);
      });

      socket.on('disconnect', () => {
        connectionCount = Math.max(0, connectionCount - 1);
        logger.info(`Socket disconnected: ${socket.id} (${connectionCount}/${MAX_CONNECTIONS})`);
      });
    });

    server.listen(PORT, () => {
      logger.info(`Worker ${process.pid} started on port ${PORT}`);
    });

    (global as any).io = io;
  });
}

// For non-clustered environments (like some dev setups or specific cPanel configs), export app
export default app;
