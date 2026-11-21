/**
 * Tailwind compilado localmente (antes: cdn.tailwindcss.com, que gera o CSS no
 * navegador a cada abertura e não funciona sem internet no primeiro acesso).
 * Após alterar classes no index.html ou em js/, rode:  npm run build:css
 */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  // Classes montadas em tempo de execução (tabela de circuitos: text-${cor}-400 ...)
  safelist: [
    { pattern: /^(text|bg|border)-(amber|emerald|blue)-(300|400|500)(\/(20|30))?$/ }
  ],
  theme: {
    extend: {
      // Tons intermediários usados no HTML (entre slate-700/800 e 800/900)
      colors: { slate: { 750: '#283548', 850: '#172033' } },
      spacing: { 13: '3.25rem' }
    }
  },
  plugins: []
};
