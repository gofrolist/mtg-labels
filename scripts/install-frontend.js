import { execSync } from 'child_process';

console.log('Installing frontend dependencies...');
execSync('cd /vercel/share/v0-project/frontend && npm install', { stdio: 'inherit' });
console.log('Frontend dependencies installed successfully.');
