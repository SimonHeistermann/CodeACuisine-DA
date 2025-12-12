import type { Environment } from './../app/core/models/environment.model';

/**
 * Environment configuration for development builds.
 *
 * This file defines environment-specific values that are replaced
 * at build time by Angular's file replacement mechanism.
 *
 * Responsibilities:
 * - Indicate whether the application is running in production mode
 * - Provide the backend webhook URL used for recipe generation
 *
 * Note:
 * - This configuration is intended for local development only.
 * - The webhook URL typically points to a locally running service (e.g. n8n).
 */
export const environment: Environment = {
  /** Indicates whether the application is running in production mode. */
  production: false,

  /**
   * Webhook endpoint used to trigger recipe generation.
   *
   * In development, this usually points to a local backend instance.
   */
  webhookUrl: 'http://localhost:5678/webhook/generate-recipe',
};