import type { Environment } from './../app/core/models/environment.model';

export const environment: Environment = {
    production: false,
    webhookUrl: 'http://localhost:5678/webhook-test/generate-recipe',
    databaseUrl: 'http://localhost:5984/recipe-app-dev',
};
  