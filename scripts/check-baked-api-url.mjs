import { Client } from 'ssh2';

const config = {
  host: '202.10.34.42',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();

console.log('Connecting to VPS to check baked VITE_API_URL...');

conn.on('ready', () => {
  // Let's grep for "localhost:4322" or "VITE_API_URL" in dist/assets
  const command = `grep -r "localhost:4322" /opt/rute-app/dist/assets/ || echo "localhost:4322 not found in dist"`;
  
  conn.exec(command, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect(config);
