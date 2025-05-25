import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getAnalytics, provideAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, provideAppCheck } from '@angular/fire/app-check';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getDataConnect, provideDataConnect } from '@angular/fire/data-connect';
import { connectorConfig } from '@firebasegen/default-connector';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { getRemoteConfig, provideRemoteConfig } from '@angular/fire/remote-config';
import { getVertexAI, provideVertexAI } from '@angular/fire/vertexai';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideFirebaseApp(() => initializeApp({ projectId: "testdb-apps", appId: "1:826407458596:web:60af07e0008018e5b145b1", storageBucket: "testdb-apps.firebasestorage.app", apiKey: "AIzaSyDJKVEV-r7ahnn4jm9kZbA_XT1yE13c5Fs", authDomain: "testdb-apps.firebaseapp.com", messagingSenderId: "826407458596", measurementId: "G-12L6FDZFR5" })), 
    provideAuth(() => getAuth()), 
    provideAnalytics(() => getAnalytics()), 
    provideHttpClient(
      withInterceptorsFromDi() // <-- Gunakan ini untuk mendukung interceptor berbasis DI lama
    ),
    ScreenTrackingService, 
    UserTrackingService, 
    // provideAppCheck(() => {
    //   // TODO get a reCAPTCHA Enterprise here https://console.cloud.google.com/security/recaptcha?project=_
    //   const provider = new ReCaptchaEnterpriseProvider("6LeUZS0rAAAAAFZck6L0Szm6yC2xT63bbSGu9nDr");
    //   return initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
    // }), 
    provideFirestore(() => getFirestore()), 
    provideDatabase(() => getDatabase()), 
    provideDataConnect(() => getDataConnect(connectorConfig)), 
    provideTanStackQuery(new QueryClient()), 
    provideFunctions(() => getFunctions()), 
    provideMessaging(() => getMessaging()), 
    providePerformance(() => getPerformance()), 
    provideStorage(() => getStorage()), 
    provideRemoteConfig(() => getRemoteConfig()), 
    provideVertexAI(() => getVertexAI())]
};
