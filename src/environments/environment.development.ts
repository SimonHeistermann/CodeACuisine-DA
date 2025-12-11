import type { Environment } from './../app/core/models/environment.model';

export const environment: Environment = {
    production: false,
    webhookUrl: 'http://localhost:5678/webhook/generate-recipe',
};
  