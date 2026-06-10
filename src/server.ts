import app from './app';
import { ENV } from './config/env';

const PORT = ENV.PORT;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(`
     API base: http://localhost:${PORT}/api`);
});