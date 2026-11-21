// Copia o CSS e as fontes do Font Awesome (instalado pelo npm) para libs/fontawesome,
// para o app funcionar sem CDN. Uso: npm run build:icones
const fs = require('fs');
const path = require('path');
const origem = path.join(__dirname, '..', 'node_modules', '@fortawesome', 'fontawesome-free');
const destino = path.join(__dirname, '..', 'libs', 'fontawesome');
fs.mkdirSync(path.join(destino, 'css'), { recursive: true });
fs.mkdirSync(path.join(destino, 'webfonts'), { recursive: true });
fs.copyFileSync(path.join(origem, 'css', 'all.min.css'), path.join(destino, 'css', 'all.min.css'));
fs.copyFileSync(path.join(origem, 'LICENSE.txt'), path.join(destino, 'LICENSE.txt'));
for (const f of fs.readdirSync(path.join(origem, 'webfonts'))) {
  if (f.endsWith('.woff2')) fs.copyFileSync(path.join(origem, 'webfonts', f), path.join(destino, 'webfonts', f));
}
console.log('Font Awesome copiado para', destino);
