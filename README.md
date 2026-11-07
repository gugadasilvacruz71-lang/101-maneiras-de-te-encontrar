# 101 maneiras de te encontrar

Aplicação Express com contador e liberação da playlist controlada no servidor.

## Render
- Runtime: Node
- Build command: npm install
- Start command: npm start
- Environment variable: PLAYLIST_URL (link da playlist Spotify)

O link da playlist não fica no HTML nem no JavaScript público. A rota /api/unlock só o retorna a partir de 7 de novembro de 2026, às 19h54 no fuso de São Paulo (UTC-3). O contador no navegador é visual; a liberação efetiva é decidida pelo servidor.
