import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, tap, map, catchError } from 'rxjs/operators';

import { GeneratedRecipe } from '../../models/recipe.model';
import type {
  GenerateRecipeResponse,
  QuotaErrorResponse,
  QuotaInfo,
} from '../../models/recipe.model';
import { environment } from '../../../../environments/environment';
import { StateService } from '../state-service/state.service';
import { FirestoreRecipeService } from '../firebase-recipe-service/firebase-recipe.service';
import { ToastService } from '../toast-service/toast.service';

/**
 * Webhook endpoint used to generate recipes.
 *
 * Note: This value is derived from the Angular environment configuration and therefore
 * differs between development/production builds.
 */
const webhookUrl = environment.webhookUrl;

@Injectable({ providedIn: 'root' })
/**
 * Service responsible for requesting recipe generation from the backend webhook and
 * coordinating all client-side side effects.
 *
 * Key responsibilities:
 * - Sends the current `recipeRequirements` to the configured webhook endpoint.
 * - Applies success side effects (quota normalization + toast messaging).
 * - Persists/syncs returned recipes into Firestore and stores them in application state.
 * - Handles quota errors (HTTP 429) and displays user-friendly toast messages.
 */
export class GenerateRecipeService {
  /**
   * Creates the service.
   *
   * @param http Angular `HttpClient` used for making the webhook request.
   * @param state Application state container used for requirements, results and quota.
   * @param firestore Firestore service used to sync returned recipes into the cookbook.
   * @param toast Toast service used for user-facing feedback (success/error/quota).
   */
  constructor(
    private readonly http: HttpClient,
    private readonly state: StateService,
    private readonly firestore: FirestoreRecipeService,
    private readonly toast: ToastService,
  ) {}

  /**
   * Generates recipes via the backend webhook.
   *
   * Flow:
   * 1) POST current requirements to the webhook.
   * 2) On success, normalize and store quota + show a success toast.
   * 3) Sync returned recipes to Firestore, then store them in state.
   * 4) On error, detect quota exceeded (HTTP 429) and show appropriate messaging.
   *
   * @returns Observable that emits the final (synced) list of generated recipes.
   */
  generateRecipe(): Observable<GeneratedRecipe[]> {
    return this.http
      .post<GenerateRecipeResponse>(webhookUrl, this.requestPayload())
      .pipe(
        tap((res) => this.applySuccessSideEffects(res)),
        switchMap((res) => this.syncAndStoreRecipes(res.recipes)),
        catchError((err) => this.handleRequestError(err)),
      );
  }

  /**
   * Builds the payload for the recipe generation request.
   *
   * @returns The current recipe requirements from application state.
   */
  private requestPayload() {
    return this.state.recipeRequirements;
  }

  /**
   * Applies side effects after a successful generation response.
   *
   * - Normalizes the quota object (ensuring safe numeric values and defaults)
   * - Stores the quota in application state
   * - Shows a success toast with remaining quota info
   *
   * @param res Successful response payload from the webhook.
   */
  private applySuccessSideEffects(res: GenerateRecipeResponse): void {
    const quota = this.normalizeQuota(res.quota);
    this.state.quota = quota;
    this.showSuccessToast(quota);
  }

  /**
   * Syncs the generated recipes into Firestore and stores the synced result in state.
   *
   * Firestore sync ensures recipe ids/signatures exist and that the returned objects
   * reflect persisted state.
   *
   * @param recipes The raw recipes returned by the generation webhook.
   * @returns Observable emitting the synced recipe list.
   */
  private syncAndStoreRecipes(recipes: GeneratedRecipe[]): Observable<GeneratedRecipe[]> {
    return from(this.firestore.syncGeneratedRecipes(recipes)).pipe(
      tap((synced) => (this.state.generatedRecipes = synced)),
      map((synced) => synced),
    );
  }

  /**
   * Central error handler for the webhook request.
   *
   * If the request failed due to quota exhaustion (HTTP 429 with a quota body),
   * the quota is normalized and stored and a quota-specific toast is shown.
   * Otherwise, a generic error toast is shown.
   *
   * The original error is rethrown to keep downstream error handling behavior intact.
   *
   * @param err The HTTP error returned by `HttpClient`.
   * @returns Observable error that rethrows the original error.
   */
  private handleRequestError(err: HttpErrorResponse) {
    const body = this.asQuotaError(err.error);
    if (this.isQuotaExceeded(err, body)) this.applyQuotaError(body!);
    else this.showGenericErrorToast();
    return throwError(() => err);
  }

  /**
   * Determines whether an error indicates a quota exhaustion response.
   *
   * @param err The HTTP error response.
   * @param body Parsed error body if it matches the expected quota error shape.
   * @returns True if HTTP status is 429 and the body contains quota information.
   */
  private isQuotaExceeded(err: HttpErrorResponse, body?: QuotaErrorResponse): boolean {
    return err.status === 429 && !!body?.quota;
  }

  /**
   * Applies quota information from a quota error response to the application state
   * and shows a quota-specific toast message.
   *
   * @param body The quota error response payload.
   */
  private applyQuotaError(body: QuotaErrorResponse): void {
    const quota = this.normalizeQuota(body.quota);
    this.state.quota = quota;
    this.showQuotaToast(body.message);
  }

  /**
   * Shows a success toast after recipes were generated successfully.
   *
   * @param quota The normalized quota information to display to the user.
   */
  private showSuccessToast(quota: QuotaInfo): void {
    this.toast.show({
      title: 'Rezept erstellt',
      message: this.buildQuotaMessage(quota),
    });
  }

  /**
   * Shows a toast indicating the quota limit has been reached.
   *
   * @param message Optional backend-provided message; falls back to a default text.
   */
  private showQuotaToast(message?: string): void {
    this.toast.show({
      title: 'Limit erreicht',
      message: message || 'Tageslimit erreicht. Bitte versuche es morgen erneut.',
    });
  }

  /**
   * Shows a generic error toast for non-quota related failures.
   */
  private showGenericErrorToast(): void {
    this.toast.show({
      title: 'Fehler',
      message: 'Rezept konnte nicht generiert werden.',
    });
  }

  /**
   * Formats a user-facing quota message showing remaining requests for both
   * IP-based and system-wide quotas.
   *
   * @param quota Normalized quota information.
   * @returns A formatted string describing remaining quota buckets.
   */
  private buildQuotaMessage(quota: QuotaInfo): string {
    const ip = quota.ip;
    const sys = quota.system;
    return `Heute noch verfügbar: IP ${ip.remaining}/${ip.limit}, System ${sys.remaining}/${sys.limit}`;
  }

  /**
   * Normalizes quota information into a safe, complete `QuotaInfo` object.
   *
   * Ensures:
   * - missing quota objects fall back to defaults
   * - all values are finite integers
   * - remaining values are never negative
   *
   * @param input Quota payload from success or error responses.
   * @returns Normalized quota object.
   */
  private normalizeQuota(input: QuotaInfo | null | undefined): QuotaInfo {
    const fallback = this.defaultQuota();
    if (!input) return fallback;

    const ip = this.normalizeQuotaBucket(input.ip, fallback.ip);
    const system = this.normalizeQuotaBucket(input.system, fallback.system);

    return { ip, system };
  }

  /**
   * Normalizes a single quota bucket (e.g. `ip` or `system`) to safe integer values.
   *
   * Rules:
   * - `limit`, `used`, `remaining` are converted to integers if possible
   * - `remaining` defaults to `limit - used` when missing
   * - `remaining` is clamped to a minimum of 0
   *
   * @param bucket Incoming bucket values (possibly undefined or partially missing).
   * @param fallback Fallback bucket used when values are invalid/missing.
   * @returns Normalized quota bucket.
   */
  private normalizeQuotaBucket(
    bucket: QuotaInfo['ip'] | undefined,
    fallback: QuotaInfo['ip'],
  ): QuotaInfo['ip'] {
    const limit = this.toInt(bucket?.limit, fallback.limit);
    const used = this.toInt(bucket?.used, fallback.used);
    const remaining = this.toInt(bucket?.remaining, Math.max(0, limit - used));
    return { limit, used, remaining: Math.max(0, remaining) };
  }

  /**
   * Provides default quota values used as fallback when the backend does not supply quota data.
   *
   * @returns Default quota configuration for both buckets.
   */
  private defaultQuota(): QuotaInfo {
    return {
      ip: { limit: 3, used: 0, remaining: 3 },
      system: { limit: 12, used: 0, remaining: 12 },
    };
  }

  /**
   * Converts an arbitrary value to an integer if possible; otherwise returns a fallback.
   *
   * @param value Any value expected to represent a number.
   * @param fallback Value used when `value` cannot be converted to a finite number.
   * @returns Truncated integer representation or the fallback.
   */
  private toInt(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }

  /**
   * Attempts to interpret an unknown error payload as a `QuotaErrorResponse`.
   *
   * This is a lightweight runtime guard that only checks the top-level shape
   * (object-ness) and then casts.
   *
   * @param value Error payload to interpret.
   * @returns A `QuotaErrorResponse` if the payload is object-like, otherwise `undefined`.
   */
  private asQuotaError(value: unknown): QuotaErrorResponse | undefined {
    if (!value || typeof value !== 'object') return undefined;
    return value as QuotaErrorResponse;
  }
}