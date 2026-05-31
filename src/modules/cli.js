const { exec } = require('child_process');

async function runCliTest(command) {
  console.log(`Running CLI test for: ${command}`);
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`CLI test failed: ${stderr}`);
        return reject(error);
      }
      console.log(`CLI test output: ${stdout}`);
      resolve(stdout);
    });
  });
}

module.exports = { runCliTest };
