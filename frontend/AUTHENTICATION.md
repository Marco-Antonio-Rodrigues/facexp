# Sistema de Autenticação - Frontend

Sistema completo de autenticação integrado com o backend Django.

## Estrutura Criada

### 📁 Páginas
- **`/`** - Landing page com opções de login e registro
- **`/login`** - Página de login com código por e-mail
- **`/register`** - Página de registro de novos usuários
- **`/dashboard`** - Dashboard protegido (requer autenticação)

### 🔧 Componentes UI
- **`Button`** - Botão reutilizável com variantes e loading
- **`Input`** - Input com label e mensagens de erro
- **`Card`** - Cards para estruturação de conteúdo

### 📦 Bibliotecas e Hooks
- **`lib/api.ts`** - Cliente API para comunicação com backend Django
- **`contexts/AuthContext.tsx`** - Context para gerenciamento de autenticação

## Fluxo de Autenticação

### Login (Usuários normais)
1. Usuário informa e-mail
2. Sistema envia código de 6 dígitos por e-mail
3. Usuário informa o código recebido
4. Sistema valida e retorna tokens JWT
5. Usuário é redirecionado para dashboard

### Registro
1. Usuário preenche nome, e-mail e senha
2. Sistema cria conta
3. E-mail de confirmação é enviado
4. Usuário precisa confirmar e-mail antes de fazer login

## Endpoints Utilizados

### Autenticação
- `POST /users/login/request-code/` - Solicita código de login
- `POST /users/login/verify-code/` - Valida código e retorna tokens
- `POST /users/token/` - Login com senha (apenas admins)
- `POST /users/token/refresh/` - Renova access token
- `POST /users/token/revoke/` - Logout

### Usuário
- `POST /users/user/` - Registro de novo usuário
- `GET /users/user/` - Obtém dados do usuário autenticado
- `PATCH /users/user/` - Atualiza dados do usuário
- `POST /users/user/confirm-email/` - Confirma e-mail
- `POST /users/user/resend-email-confirmation/` - Reenvia confirmação

## Configuração

### 1. Instalar dependências
```bash
cd frontend
npm install
```

### 2. Configurar variáveis de ambiente
Copie `.env.local.example` para `.env.local`:
```bash
cp .env.local.example .env.local
```

Edite `.env.local` e configure a URL do backend:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Iniciar servidor de desenvolvimento
```bash
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

## Funcionalidades Implementadas

### ✅ Sistema de Autenticação
- [x] Login com código por e-mail (usuários normais)
- [x] Login com senha (apenas admins)
- [x] Registro de novos usuários
- [x] Confirmação de e-mail
- [x] Reenvio de e-mail de confirmação
- [x] Logout com revogação de tokens
- [x] Proteção de rotas (redirect se não autenticado)
- [x] Persistência de sessão (localStorage)
- [x] Context API para estado global

### 🎨 Interface
- [x] Landing page responsiva
- [x] Formulários de login e registro
- [x] Dashboard básico com informações do usuário
- [x] Componentes reutilizáveis
- [x] Loading states
- [x] Tratamento de erros
- [x] Mensagens de sucesso/erro

### 🔒 Segurança
- [x] Tokens JWT armazenados localmente
- [x] Headers de autorização automáticos
- [x] Validação de formulários
- [x] Tratamento de erros da API

## Próximos Passos

### Funcionalidades Futuras
- [ ] Página de confirmação de e-mail
- [ ] Reset de senha
- [ ] Edição de perfil completo
- [ ] Upload de foto de perfil
- [ ] Página de consulta de placas
- [ ] Sistema de créditos/pagamentos
- [ ] Histórico de transações
- [ ] Histórico de consultas
- [ ] Área administrativa

### Melhorias Técnicas
- [ ] Refresh automático de tokens
- [ ] Interceptor para renovação de tokens expirados
- [ ] Testes unitários
- [ ] Testes E2E
- [ ] Validação de formulários com biblioteca (Zod/Yup)
- [ ] Toast notifications
- [ ] Dark mode
- [ ] Internacionalização (i18n)

## Estrutura de Pastas

```
frontend/
├── app/
│   ├── login/
│   │   └── page.tsx           # Página de login
│   ├── register/
│   │   └── page.tsx           # Página de registro
│   ├── dashboard/
│   │   └── page.tsx           # Dashboard protegido
│   ├── layout.tsx             # Layout global com AuthProvider
│   └── page.tsx               # Landing page
├── components/
│   └── ui/
│       ├── Button.tsx         # Componente Button
│       ├── Input.tsx          # Componente Input
│       └── Card.tsx           # Componente Card
├── contexts/
│   └── AuthContext.tsx        # Context de autenticação
├── lib/
│   └── api.ts                 # Cliente API
└── .env.local                 # Variáveis de ambiente
```

## Tecnologias Utilizadas

- **Next.js 16** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - Estilização
- **Context API** - Gerenciamento de estado
- **JWT** - Autenticação

## Observações Importantes

1. **Confirmação de e-mail é obrigatória**: Após o registro, o usuário precisa confirmar o e-mail antes de fazer login.

2. **Login com código**: Usuários normais fazem login através de código de 6 dígitos enviado por e-mail (sem senha).

3. **Login com senha**: Disponível apenas para administradores através do endpoint `/users/token/`.

4. **Tokens JWT**: Access token e refresh token são armazenados no localStorage.

5. **Backend deve estar rodando**: Certifique-se de que o backend Django está rodando em `http://localhost:8000` (ou configure a URL correta no `.env.local`).
