import { Client } from 'ssh2';

const config = {
  host: 'ruteapp.cloud',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();

console.log('Connecting to VPS to check environment variables...');

conn.on('ready', () => {
  conn.exec('cat /opt/rute-app/.env', (err, stream) => {
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
