import type { Environment } from './../app/core/models/environment.model';

export const environment: Environment = {
    production: true,
    webhookUrl: 'https://example.com/webhook/generate-recipe', // Platzhalter für später
    databaseUrl: 'http://localhost:5984/recipe-app-dev',
};  