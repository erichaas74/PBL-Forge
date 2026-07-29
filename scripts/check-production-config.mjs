import fs from 'node:fs';

const configPath = 'src/environments/environment.production.ts';
const config = fs.readFileSync(configPath, 'utf8');

if (config.includes('REPLACE_WITH_')) {
  console.error(
    `Deployment stopped: replace the placeholder Firebase values in ${configPath} first.`
  );
  process.exit(1);
}

console.log('Production Firebase configuration is present.');
