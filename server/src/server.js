require('dotenv').config();

const app = require('./app');
const connectDb = require('./config/db');

const port = process.env.PORT || 4000;

async function start() {
  await connectDb(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Server failed to start:', err.message);
  process.exit(1);
});
