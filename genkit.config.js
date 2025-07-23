const { configureGenkit } = require('@genkit-ai/core');
const { vertexAI } = require('@genkit-ai/vertexai');

module.exports = configureGenkit({
  plugins: [
    vertexAI({
      location: 'us-central1', // Ou a localização de sua preferência
      // O projectId será pego da variável de ambiente GCLOUD_PROJECT
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
