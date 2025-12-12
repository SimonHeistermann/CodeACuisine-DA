import type { Environment } from './../app/core/models/environment.model';

/**
 * Environment configuration for production builds.
 *
 * This file defines environment-specific values that are replaced
 * at build time by Angular's file replacement mechanism.
 *
 * Responsibilities:
 * - Indicate that the application is running in production mode
 * - Provide the backend webhook URL used for recipe generation
 *
 * Note:
 * - In a real production setup, the webhook URL should point to
 *   a secure, publicly accessible backend endpoint.
 */
export const environment: Environment = {
  /** Indicates that the application is running in production mode. */
  production: true,

  /**
   * Webhook endpoint used to trigger recipe generation.
   *
   * Replace this URL with the production backend endpoint
   * before deploying to a live environment.
   */
  webhookUrl: 'http://localhost:5678/webhook/generate-recipe',
};