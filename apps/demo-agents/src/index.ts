/**
 * Demo Agents Launcher
 * 
 * Starts all demo AI agents for NEXUS-402 demonstration.
 */

import { spawn } from 'child_process';
import * as path from 'path';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 NEXUS-402 Demo Agents                                ║
║                                                           ║
║   Starting all demonstration AI agents...                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

const agents = [
  { name: 'DeFi Strategist', file: 'agents/defi-strategist.ts', port: 4001 },
  { name: 'Payment Processor', file: 'agents/payment-processor.ts', port: 4002 },
  { name: 'Price Oracle', file: 'agents/price-oracle.ts', port: 4003 },
];

const processes: any[] = [];

function startAgent(agent: typeof agents[0]) {
  const agentPath = path.join(__dirname, agent.file);
  
  console.log(`Starting ${agent.name} on port ${agent.port}...`);
  
  const proc = spawn('npx', ['tsx', agentPath], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      [`${agent.name.toUpperCase().replace(' ', '_')}_PORT`]: agent.port.toString()
    }
  });

  proc.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(`[${agent.name}] ${data}`);
  });

  proc.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[${agent.name}] ${data}`);
  });

  proc.on('error', (err) => {
    console.error(`Failed to start ${agent.name}:`, err);
  });

  proc.on('exit', (code) => {
    console.log(`${agent.name} exited with code ${code}`);
  });

  processes.push(proc);
}

// Start all agents
agents.forEach(startAgent);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down all agents...');
  processes.forEach(p => p.kill());
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down all agents...');
  processes.forEach(p => p.kill());
  process.exit(0);
});

console.log(`
All agents started! Available endpoints:

🤖 DeFi Strategist:    http://localhost:4001
💸 Payment Processor:  http://localhost:4002  
📊 Price Oracle:       http://localhost:4003

Press Ctrl+C to stop all agents.
`);
