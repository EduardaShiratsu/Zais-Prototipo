# Zais — A Casa Mais Dançante

Site da casa: programação, horários, como chegar, reserva de mesas com mapa do salão e área da equipe (login, níveis de acesso e histórico por mesa/baile).

Site estático (sem build) + Firebase gratuito (Firestore e Authentication).

## Testar sem Firebase
Abra o site com `?demo` no final do endereço (ex.: `https://SEU-USUARIO.github.io/zais-prototipo/?demo`). Os dados são de exemplo e não são salvos.
Acessos de teste: `admin`/`admin` (nível 3), `caixa`/`caixa` (nível 2), `recepcao`/`recepcao` (nível 1).

Localmente: `python3 -m http.server 8000` e abra `http://localhost:8000/?demo`.

## Níveis de acesso
1. Só reserva mesas (não edita nem cancela).
2. Reserva, edita, cancela e confirma pagamento.
3. Tudo: bailes, valores, bloqueio de mesas, cativos e equipe.

## Colocar no ar com o Firebase (projeto `reserva-mesas-e6b98`)
1. **Firestore Database**: Console do Firebase → Build → Firestore Database → criar banco (modo produção).
2. **Authentication**: Build → Authentication → Sign-in method → ativar **E-mail/senha**.
3. **Regras**: Firestore → Regras → colar o conteúdo de `firestore.rules` → Publicar.
4. **Primeiro administrador**:
   - Authentication → Usuários → Adicionar usuário: e-mail `SEUUSUARIO@zais-staff.app` + uma senha (o "usuário" digitado no login é a parte antes do `@`).
   - Copie o UID desse usuário.
   - Firestore → coleção `colaboradores` → documento com ID = UID, campos: `nome` (texto), `usuario` (texto, igual ao do e-mail), `nivel` (número 3), `ativo` (booleano true).
5. Entre em **Equipe** no site e crie os demais colaboradores pela tela "Equipe".
6. Authentication → Settings → Authorized domains: confirme que o domínio do GitHub Pages (`SEU-USUARIO.github.io`) está na lista.
7. Crie os bailes pela tela "Novo baile" e cadastre os cativos em "Cativos".

> A configuração web do Firebase (`js/config.js`) é pública por natureza; quem protege os dados são as **regras** do passo 3. Teste as regras no simulador do console antes de divulgar.

## Pagamento por Pix
Nesta versão a reserva pública é pelo WhatsApp e a equipe marca "aguardando pagamento" e confirma na mesa. Pix automático exige um servidor (webhook), que não cabe no plano gratuito do Firebase; pode ser ligado depois com um Cloudflare Worker gratuito + Mercado Pago.

## Estrutura
- `js/telas/` telas (públicas e da equipe) · `js/data/` camada de dados (`firebase.js` e `demo.js`) · `js/layout.js` mapa do salão · `firestore.rules` regras de segurança.
