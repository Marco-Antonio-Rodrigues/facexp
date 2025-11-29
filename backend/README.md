# Cardap.io Backend

Este é o repositório do backend do Cardap.io, um sistema para gestão de negócios de restaurantes. Ele fornece APIs e funcionalidades de back-office para administração de pedidos, produtos, horários de funcionamento e mais.

## Estrutura do Projeto

O projeto segue a seguinte estrutura de diretórios:

```markdown
.
├── core/                # Configurações e utilitários globais do projeto
├── users/               # Aplicação para gerenciamento de usuários e autenticação
```

## Requisitos

- **Python 3.12** ou superior
- **Poetry** (para gerenciamento de dependências)

## Configuração do Ambiente

1. **Instalar as dependências:**

   Certifique-se de ter o Poetry instalado e execute:

   ```bash
   poetry install
   ```

2. **Configurar as variáveis de ambiente**

3. **Rodar o servidor de desenvolvimento:**

   ```bash
   poetry run python manage.py runserver
   ```

## Executando Testes

Para rodar os testes, utilize:

```bash
poetry run python manage.py test
```
