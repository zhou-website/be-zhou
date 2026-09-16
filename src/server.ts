import 'dotenv/config';
import { app } from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Zhou Consulting Backend API running on port ${PORT}`);
  console.log(`📚 Scalar API Documentation available at http://localhost:${PORT}/docs`);
  console.log(`🩺 Health check endpoint at http://localhost:${PORT}/api/health`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});
