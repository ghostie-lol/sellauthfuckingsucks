import { registerCommands } from './deployCommands.js';

registerCommands()
  .then(() => {
    console.log('Global slash command deployment completed.');
  })
  .catch((error: unknown) => {
    console.error('Global slash command deployment failed:', error);
    process.exitCode = 1;
  });
