import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target: './openapi.json',
      validation: false,
      filters: {
        paths: ['/api/sets', '/api/card-types'],
      },
    },
    output: {
      target: './src/api/queries',
      schemas: './src/api/model',
      client: 'react-query',
      mode: 'tags-split',
      clean: true,
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          signal: true,
        },
      },
    },
  },
})
