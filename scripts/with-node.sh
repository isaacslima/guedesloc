#!/usr/bin/env bash
# Garante que os comandos do Vite rodem na versão de Node exigida (engines em
# package.json / .nvmrc), mesmo que o shell atual esteja numa versão mais
# antiga (ex.: Node 18 do sistema) — evita o erro "node:util does not
# provide an export named 'styleText'" do rolldown/Vite 8.
#
# unset de npm_config_prefix é necessário porque `npm run` injeta essa
# variável no ambiente do script, e o nvm se recusa a trocar de versão
# quando ela está definida ("nvm is not compatible with the npm_config_prefix
# environment variable").
unset npm_config_prefix
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use >/dev/null 2>&1
fi
exec "$@"
