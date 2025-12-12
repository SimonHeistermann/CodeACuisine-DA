import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, tap, map, catchError } from 'rxjs/operators';

import { GeneratedRecipe } from '../../models/recipe.model';
import type { GenerateRecipeResponse, QuotaErrorResponse, QuotaInfo } from '../../models/recipe.model';
import { environment } from '../../../../environments/environment';
import { StateService } from '../state-service/state.service';
import { FirestoreRecipeService } from '../firebase-recipe-service/firebase-recipe.service';
import { ToastService } from '../toast-service/toast.service';

const webhookUrl = environment.webhookUrl;

@Injectable({ providedIn: 'root' })
export class GenerateRecipeService {
  constructor(
    private readonly http: HttpClient,
    private readonly state: StateService,
    private readonly firestore: FirestoreRecipeService,
    private readonly toast: ToastService,
  ) {}

  generateRecipe(): Observable<GeneratedRecipe[]> {
    return this.http.post<GenerateRecipeResponse>(webhookUrl, this.requestPayload()).pipe(
      tap((res) => this.applySuccessSideEffects(res)),
      switchMap((res) => this.syncAndStoreRecipes(res.recipes)),
      catchError((err) => this.handleRequestError(err)),
    );
  }

  private requestPayload() {
    return this.state.recipeRequirements;
  }

  private applySuccessSideEffects(res: GenerateRecipeResponse): void {
    const quota = this.normalizeQuota(res.quota);
    this.state.quota = quota;
    this.showSuccessToast(quota);
  }

  private syncAndStoreRecipes(recipes: GeneratedRecipe[]): Observable<GeneratedRecipe[]> {
    return from(this.firestore.syncGeneratedRecipes(recipes)).pipe(
      tap((synced) => (this.state.generatedRecipes = synced)),
      map((synced) => synced),
    );
  }

  private handleRequestError(err: HttpErrorResponse) {
    const body = this.asQuotaError(err.error);
    if (this.isQuotaExceeded(err, body)) this.applyQuotaError(body!);
    else this.showGenericErrorToast();
    return throwError(() => err);
  }

  private isQuotaExceeded(err: HttpErrorResponse, body?: QuotaErrorResponse): boolean {
    return err.status === 429 && !!body?.quota;
  }

  private applyQuotaError(body: QuotaErrorResponse): void {
    const quota = this.normalizeQuota(body.quota);
    this.state.quota = quota;
    this.showQuotaToast(body.message);
  }

  private showSuccessToast(quota: QuotaInfo): void {
    this.toast.show({
      title: 'Rezept erstellt',
      message: this.buildQuotaMessage(quota),
    });
  }

  private showQuotaToast(message?: string): void {
    this.toast.show({
      title: 'Limit erreicht',
      message: message || 'Tageslimit erreicht. Bitte versuche es morgen erneut.',
    });
  }

  private showGenericErrorToast(): void {
    this.toast.show({
      title: 'Fehler',
      message: 'Rezept konnte nicht generiert werden.',
    });
  }

  private buildQuotaMessage(quota: QuotaInfo): string {
    const ip = quota.ip;
    const sys = quota.system;
    return `Heute noch verfügbar: IP ${ip.remaining}/${ip.limit}, System ${sys.remaining}/${sys.limit}`;
  }

  private normalizeQuota(input: QuotaInfo | null | undefined): QuotaInfo {
    const fallback = this.defaultQuota();
    if (!input) return fallback;

    const ip = this.normalizeQuotaBucket(input.ip, fallback.ip);
    const system = this.normalizeQuotaBucket(input.system, fallback.system);

    return { ip, system };
  }

  private normalizeQuotaBucket(
    bucket: QuotaInfo['ip'] | undefined,
    fallback: QuotaInfo['ip'],
  ): QuotaInfo['ip'] {
    const limit = this.toInt(bucket?.limit, fallback.limit);
    const used = this.toInt(bucket?.used, fallback.used);
    const remaining = this.toInt(bucket?.remaining, Math.max(0, limit - used));
    return { limit, used, remaining: Math.max(0, remaining) };
  }

  private defaultQuota(): QuotaInfo {
    return {
      ip: { limit: 3, used: 0, remaining: 3 },
      system: { limit: 12, used: 0, remaining: 12 },
    };
  }

  private toInt(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }

  private asQuotaError(value: unknown): QuotaErrorResponse | undefined {
    if (!value || typeof value !== 'object') return undefined;
    return value as QuotaErrorResponse;
  }
}