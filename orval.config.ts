import { defineConfig } from 'orval';

export default defineConfig({
  fleetApi: {
    input: 'http://localhost:8080/v3/api-docs', // Spring Boot API spec URL
    output: {
      target: './src/api/generated.ts',          // Destination file for types & API calls
      client: 'react-query',                    // Generates React hooks + Axios calls
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/api/axios-instance.ts',  // Custom Axios instance for JWT handling
          name: 'customInstance',
        },
      },
    },
  },
});