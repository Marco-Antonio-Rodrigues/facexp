import { defineConfig } from 'orval';

export default defineConfig({
  facexp: {
    output: {
      mode: 'tags-split', // Separa arquivos por 'tag' (ex: Experiments, Users)
      target: 'services', // Onde os arquivos serão salvos
      schemas: 'types', // Onde as interfaces (tipos) ficam
      client: 'react-query', // Gera hooks prontos (useCreateExperiment, etc)
      override: {
        mutator: {
          path: './lib/api-client.ts',
          name: 'customInstance',
        },
      },
    },
    input: {
      // AQUI ESTÁ A MÁGICA: Aponta para o Django rodando localmente
      target: 'http://localhost:8000/api/schema/',
    },
  },
});