import { spawn } from 'child_process';

const command = 'node';
const args = [
  '--require', 'tests/loadEnv.js',
  '--trace-warnings',
  '--input-type=module',
  '-e', 'import "./tests/e2e/challenge/challengeGeneration.e2e.test.js"'
];

const proc = spawn(command, args, { 
  stdio: 'inherit', 
  env: { ...process.env, NODE_DEBUG: 'module' }
});

proc.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
}); 