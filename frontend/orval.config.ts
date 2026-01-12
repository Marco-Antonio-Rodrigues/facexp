import { defineConfig } from 'orval';

export default defineConfig({
  facexp: {
    output: {
      mode: 'tags-split', // Separa arquivos por 'tag' (ex: Experiments, Users)
      target: 'services', // Onde os arquivos serão salvos
      schemas: 'types', // Onde as interfaces (tipos) ficam
      client: 'axios', // Gera funções simples com axios
      override: {
        mutator: {
          path: './lib/api-client.ts',
          name: 'customInstance',
        },
      },
    },
    input: {
      // Pega a URL do backend da variável de ambiente
      target: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/schema/`,
    },
  },
});