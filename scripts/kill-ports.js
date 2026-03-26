const { execSync } = require('child_process');

const ports = [3000, 3001, 5173];

console.log('--- Clearing ports ---');

ports.forEach((port) => {
  try {
    // Windows command to find PID using the port
    const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = stdout.trim().split('\n');

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];

      if (pid && pid !== '0') {
        process.stdout.write(`Found process on port ${port} (PID: ${pid}). Terminating... `);
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log('Done.');
        } catch (killError) {
          console.log('Already terminated or access denied.');
        }
      }
    });
  } catch (error) {
    // findstr returns exit code 1 if no matches found, which execSync treats as an error
    console.log(`Port ${port} is clear.`);
  }
});

console.log('--- Ports ready ---\n');
