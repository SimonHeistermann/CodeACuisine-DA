import type { Environment } from './../app/core/models/environment.model';

export const environment: Environment = {
    // Test-URL deines Webhook-Nodes in n8n
    production: false,
    webhookUrl: 'http://localhost:5678/webhook-test/generate-recipe',
};
  