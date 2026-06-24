# Acompanhamento do Cuidado

PWA (aplicativo web instalável) para a família acompanhar o cuidado de saúde, hospedado
gratuitamente no **GitHub Pages**. A página é pública, mas **todos os dados ficam
criptografados de verdade** (AES‑256‑GCM): o que está no repositório é um arquivo
embaralhado, inútil sem a senha. A senha só descriptografa os dados **no seu navegador**.

## Como funciona a segurança

- Os dados vivem **somente** em `data/dados.enc.json`, criptografados.
- A chave é derivada da senha com **PBKDF2‑SHA‑256 (250.000 iterações)**; cifragem
  **AES‑256‑GCM**. O mesmo esquema é usado no navegador (`js/crypto.js`) e na ferramenta
  de atualização (`tools/cripto.mjs`).
- A senha **nunca** é salva em lugar nenhum. Ao abrir o app, ela é digitada e usada apenas
  em memória para descriptografar.
- ⚠️ **A força da senha é a única proteção real.** Use uma **frase longa** (5+ palavras
  aleatórias, ex.: `cavalo-bateria-grampo-correto-azul`). Senha fraca pode ser quebrada por
  força bruta a partir do arquivo público.
- **Nunca** faça commit de dados em texto puro. O `.gitignore` já bloqueia
  `tools/.dados.plain.json`.

## Estrutura

```
index.html              Tela de login + app
css/styles.css          Estilo (mobile-first)
js/crypto.js            Descriptografia no navegador (Web Crypto)
js/app.js               Telas, navegação e painel de próximos eventos
data/dados.enc.json     Dados CRIPTOGRAFADOS (único arquivo de dados commitado)
manifest.webmanifest    Manifesto PWA
sw.js                   Service worker (uso offline)
icons/                  Ícones do app
tools/cripto.mjs        Ferramenta de criptografar/descriptografar (Node)
tools/dados.exemplo.json Modelo do formato dos dados (sem dados reais)
```

## Atualizar os dados (feito pelo Claude Code)

> Requer Node.js instalado. A senha vem da variável `DADOS_SENHA` (ou é pedida no terminal).

```bash
# 1. Descriptografar para um arquivo de texto temporário (ignorado pelo Git)
DADOS_SENHA="sua-frase-secreta" node tools/cripto.mjs decrypt

# 2. Editar tools/.dados.plain.json (manualmente ou pelo Claude Code)

# 3. Recriptografar, gerando data/dados.enc.json
DADOS_SENHA="sua-frase-secreta" node tools/cripto.mjs encrypt

# 4. Apagar o texto puro e publicar apenas o arquivo criptografado
rm tools/.dados.plain.json
git add data/dados.enc.json && git commit -m "Atualiza dados" && git push
```

Ao publicar uma atualização, incremente a versão do cache em `sw.js` (`cuidado-vN`) para
que os dispositivos baixem a versão nova.

## Definir/alterar a senha

A senha é simplesmente a chave usada no passo `encrypt`. Para trocar de senha, basta
`decrypt` com a senha antiga e `encrypt` com a nova.

## Rodar localmente (para testar)

O app precisa ser servido por HTTP (não abra o `index.html` por `file://`):

```bash
npx serve .
# ou
python -m http.server 8080
```

Depois acesse `http://localhost:8080` e use sua senha.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos.
2. Em **Settings → Pages**, selecione a branch `main` e a pasta raiz (`/`).
3. Aguarde o link `https://SEU-USUARIO.github.io/SEU-REPO/` ficar disponível.
4. No celular, abra o link e use **“Adicionar à tela de início”** para instalar como app.

Todos os caminhos são relativos, então funciona tanto em `usuario.github.io` quanto em
`usuario.github.io/repositorio/`.

## Testes

```bash
DADOS_SENHA="..." node tools/test-interop.mjs   # cripto navegador <-> Node
DADOS_SENHA="..." node tools/test-render.mjs     # renderização de todas as seções
```
