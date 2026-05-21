import { Client } from 'ssh2';

const config = {
  host: '202.10.34.42',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();

console.log('Connecting to VPS to check logs...');

conn.on('ready', () => {
  const command = `
    echo "=== NGINX ACCESS LOGS ==="
    tail -n 20 /var/log/nginx/access.log || true
    echo "=== NGINX ERROR LOGS ==="
    tail -n 20 /var/log/nginx/error.log || true
    echo "=== PM2 PROCESS LOGS ==="
    pm2 logs rute-api --lines 15 --raw --no-daemon & sleep 2 && kill $!
  `;
  
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
