# 🧪 FacExp - Factorial Experiments Platform

**FacExp** é uma plataforma moderna e intuitiva para planejamento, execução e análise de experimentos fatoriais. Desenvolvida para cientistas, engenheiros e pesquisadores que precisam otimizar processos e produtos através de experimentação sistemática.

## ✨ Características Principais

### 🎯 Planejamento Experimental Inteligente
- **Experimentos Fatoriais Completos 2^K**: Planejamento robusto de experimentos com K fatores em 2 níveis (baixo e alto)
- **Gerenciamento de Fatores**: Configure facilmente fatores quantitativos e qualitativos com seus níveis
- **Variável de Resposta**: Defina a variável de resposta que será medida no experimento
- **Replicatas**: Suporte a múltiplas replicatas para aumentar a confiabilidade estatística

### 📊 Coleta e Organização de Dados
- **Matriz de Design Automática**: Geração automática da matriz experimental baseada nos fatores e design escolhido
- **Interface Intuitiva**: Upload e gerenciamento fácil dos dados experimentais
- **Rastreamento de Experimentos**: Acompanhe o status de cada experimento (Draft, Design Ready, Data Collection, Analysis Ready, Completed)

### 📈 Análise Estatística Completa
- **Análise de Variância (ANOVA)**: Identifique quais fatores têm efeito significativo
- **Gráficos de Efeitos**: Visualize os efeitos principais e interações entre fatores
- **Otimização de Processos**: Encontre as melhores condições operacionais para seus objetivos

### 🔐 Segurança e Colaboração
- **Autenticação Robusta**: Sistema de login seguro com JWT
- **Gerenciamento de Usuários**: Controle de acesso e permissões
- **API RESTful**: Integração fácil com outras ferramentas e sistemas

## 🚀 Tecnologias Utilizadas

### Backend
- **Django 5.x** - Framework web robusto e escalável
- **Django REST Framework** - APIs RESTful poderosas
- **Python 3.12+** - Performance e recursos modernos
- **SQLite/PostgreSQL** - Armazenamento de dados confiável

### Frontend
- **Next.js 15** - Framework React com renderização otimizada
- **TypeScript** - Tipagem estática para maior confiabilidade
- **Tailwind CSS** - Design responsivo e moderno
- **shadcn/ui** - Componentes UI elegantes e acessíveis

## 📦 Instalação e Configuração

### Pré-requisitos
- Python 3.12 ou superior
- Node.js 18 ou superior
- Poetry (gerenciador de dependências Python)
- npm ou yarn

### Backend

```bash
# Navegue até a pasta backend
cd backend

# Instale as dependências
poetry install

# Configure as variáveis de ambiente
cp example.env .env

# Execute as migrações
poetry run python manage.py migrate

# Inicie o servidor de desenvolvimento
poetry run python manage.py runserver
```

### Frontend

```bash
# Navegue até a pasta frontend
cd frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentação da API (Swagger)**: http://localhost:8000/api/schema/swagger-ui/
- **Documentação da API (ReDoc)**: http://localhost:8000/api/schema/redoc/
- **Admin Django**: http://localhost:8000/admin

## 📖 Documentação

### Estrutura do Projeto

```
facexp/
├── backend/          # API Django REST Framework
│   ├── core/        # Configurações do projeto
│   ├── users/       # Gerenciamento de usuários
│   └── experiments/ # Lógica de experimentos fatoriais
├── frontend/         # Interface Next.js
│   ├── app/         # Páginas e rotas
│   ├── components/  # Componentes React reutilizáveis
│   ├── services/    # Serviços de API
│   └── types/       # Definições TypeScript
```

### Principais Funcionalidades

1. **Criação de Experimentos**: Defina título, descrição e número de replicatas
2. **Configuração de Fatores**: Adicione fatores com seus níveis (baixo e alto)
3. **Variável de Resposta**: Configure a métrica que será medida no experimento
4. **Matriz de Design**: Visualize a combinação de fatores para cada corrida experimental
5. **Coleta de Dados**: Registre os resultados obtidos em cada corrida experimental
6. **Análise Estatística**: Interprete os resultados com gráficos e estatísticas

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um Fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abrir um Pull Request

## 🐛 Reportando Bugs

Encontrou um bug? Abra uma [issue](https://github.com/Marco-Antonio-Rodrigues/facexp/issues) descrevendo:
- O que você estava tentando fazer
- O que aconteceu
- O que você esperava que acontecesse
- Passos para reproduzir o problema

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja os detalhes abaixo:

```
MIT License

Copyright (c) 2026 Marco Antonio Rodrigues

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 👨‍💻 Autor

**Marco Antonio Rodrigues**
- GitHub: [@Marco-Antonio-Rodrigues](https://github.com/Marco-Antonio-Rodrigues)

## 🙏 Agradecimentos

- Comunidade Django e Next.js
- Todos os contribuidores do projeto
- Pesquisadores que inspiraram esta ferramenta

---

**FacExp** - Transformando dados experimentais em conhecimento acionável 🚀
