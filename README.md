# Requisição de equipamentos EPBJC

Site estático (HTML, CSS, JavaScript) com login Microsoft (Firebase Authentication) e base de dados Cloud Firestore. Publicado no GitHub Pages.

## Ficheiros deste repositório

| Ficheiro | Função |
|---|---|
| `index.html` | Login, formulário de pedido e lista dos meus pedidos |
| `style.css` | Aparência |
| `app.js` | Login Microsoft, verificação da whitelist, criação e listagem de pedidos |
| `firestore.rules` | Regras a publicar em Firestore Database > Rules |
| `README.md` | Este guia |

Não fazem parte do site (ficam só no teu computador, fora do repositório): `authorized-users.json`, `seed-authorized-users.mjs` e `service-account.json`.

## Estrutura da base de dados (conforme o Manual Técnico)

- `authorizedUsers/{email em minúsculas}`: `email`, `active` (boolean), `role`
- `requisicoes/{ID automático}`: `codigo`, `uid`, `requisitante`, `email`, `equipamento`, `dataPedido`, `devolucaoPrevista`, `estado`, `observacoes`, `criadoEm`
- `admins/{UID Firebase}`: documento que identifica o administrador

Equipamentos: Portátil01, Portátil02, Tablet01, Tablet02, Projetor01. Estados: Pendente, Em empréstimo, Devolvido, Recusado.

## Passos pela ordem dos manuais

1. **Importar a whitelist** (Manual de Primeira Utilização, secções 3 a 12): Node.js, `authorized-users.json`, `seed-authorized-users.mjs`, `GOOGLE_APPLICATION_CREDENTIALS`, `node seed-authorized-users.mjs`. Confirma 18 documentos em `authorizedUsers`.
2. **Autenticação Microsoft**: Firebase > Authentication > Sign-in method > Microsoft (Client ID e Client Secret só aqui, na consola). O URI de redirecionamento do Entra é o do Firebase (`https://NOME-DO-PROJETO.firebaseapp.com/__/auth/handler`), não o do GitHub Pages.
3. **Configurar `app.js`**: substitui os `COLA_AQUI` do `firebaseConfig` pela configuração Web do teu projeto. Só pode existir uma declaração `const firebaseConfig`.
4. **Regras**: cola `firestore.rules` em Firestore Database > Rules e publica.
5. **Admin (opcional)**: cria em `admins` um documento com o UID Firebase do responsável (aparece em Authentication depois do primeiro login).
6. **Publicar no GitHub Pages** (Manual GitHub Pages): carrega `index.html`, `style.css`, `app.js` (e opcionalmente `README.md` e `firestore.rules`) na raiz do repositório, ativa Pages (branch `main`, `/(root)`) e autoriza `UTILIZADOR.github.io` em Authentication > Settings > Authorized domains.

## Testar localmente

O login por pop-up não funciona com duplo clique no ficheiro (`file://`). Usa um servidor local:

```
python -m http.server 5500
```

Abre `http://localhost:5500` (o `localhost` costuma vir autorizado no Firebase).

## Testes e capturas de ecrã

1. Sem sessão: só aparece o botão "Entrar com Microsoft".
2. Conta da whitelist: entra, cria um pedido e vê-o como Pendente. Confirma o documento em `requisicoes` na consola.
3. Conta do domínio escolar fora da whitelist: é recusada e não vê nem cria pedidos.
4. Altera o `estado` de um pedido na consola (por exemplo "Em empréstimo"): a lista atualiza.
5. Termina a sessão: a área de pedidos deixa de estar acessível.
6. Captura de Settings > Pages e da página publicada. Tapa nomes, emails e números de aluno.

## Ponto crítico: `email_verified`

As regras exigem `email_verified == true`, como pedem os manuais. Se um aluno autorizado receber `PERMISSION_DENIED` ao criar o pedido, verifica este ponto primeiro. Se o token da conta Microsoft não trouxer o atributo, fala com a professora antes de alterares as regras. Documenta o que encontraste na reflexão.

## Erros frequentes

| Sintoma | Verificações |
|---|---|
| `auth/unauthorized-domain` | Domínio `.github.io` nos domínios autorizados do Firebase |
| Pop-up não abre | Pop-ups bloqueados no browser |
| `PERMISSION_DENIED` | Email na whitelist (minúsculas), `active: true`, `email_verified`, regras publicadas, query com `where("uid", "==", ...)` |
| Site sem CSS | Nome `style.css`, maiúsculas/minúsculas, ficheiros na raiz |
| 404 | Branch `main`, pasta `/(root)`, `index.html` na raiz |

## Segurança

O `firebaseConfig` pode ser público. Nunca publiques `service-account.json`, o Client Secret da Microsoft nem a lista de emails dos alunos.

## Modelo de reflexão (escreve com as tuas palavras)

**Tecnologias e função de cada uma:** HTML, CSS, JavaScript, Microsoft Entra ID, Firebase Authentication, Firestore, regras de segurança, Node.js, Admin SDK, GitHub Pages.

**Como comunicam:** descreve o caminho desde o clique em "Entrar" até ao pedido aparecer na lista.

**Dificuldades e soluções:** erro, causa, como resolveste.

**Uso da IA:** para que usaste, o que testaste e alteraste, o que aprendeste.

**Perguntas de consolidação do manual:** coleção vs documento; porquê o UID e não o nome; efeito de `active: false`; porque existe a conta de serviço; porque a chave não pode estar no GitHub; diferença entre Authentication e Security Rules; um campo para uma futura coleção `equipamentos`.
