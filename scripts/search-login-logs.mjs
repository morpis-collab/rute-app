import { Client } from 'ssh2';

const config = {
  host: '202.10.34.42',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();

console.log('Connecting to VPS to search login logs...');

conn.on('ready', () => {
  const command = `grep "login" /var/log/nginx/access.log | tail -n 30 || echo "No login records found"`;
  
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
