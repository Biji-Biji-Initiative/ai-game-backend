
// Path alias registration
import moduleAlias from 'module-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register aliases
moduleAlias.addAliases({
  '@tests': path.join(__dirname, 'tests'),
  '@helpers': path.join(__dirname, 'tests/helpers'),
  '@src': path.join(__dirname, 'src')
});

console.log('Path aliases registered successfully for tests');
