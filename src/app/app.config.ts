import {
  ApplicationConfig,
  isDevMode,
  provideZoneChangeDetection,
  importProvidersFrom
} from '@angular/core'
import {
  provideRouter,
  withInMemoryScrolling,
  type InMemoryScrollingFeature,
  type InMemoryScrollingOptions,
} from '@angular/router'
import { provideStore } from '@ngrx/store'
import { provideStoreDevtools } from '@ngrx/store-devtools'
import { routes } from './app.routes'
import { provideEffects } from '@ngrx/effects'
import { rootReducer } from './store'
import { DatePipe, DecimalPipe } from '@angular/common'
import { AuthenticationEffects } from './store/authentication/authentication.effects'
import {
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http'
import { FakeBackendProvider } from './core/helpers/fake-backend'
import { CalendarEffects } from './store/calendar/calendar.effects'
import { KanbanEffects } from './store/kanban/kanban.effects'
import { initializeApp, provideFirebaseApp } from '@angular/fire/app'
import { getFirestore, provideFirestore } from '@angular/fire/firestore'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { provideAnimations } from '@angular/platform-browser/animations'

const firebaseConfig = {
  apiKey: "AIzaSyBxspYrMsyjpIinpuIjOqHMqS2cRX7cZ0c",
  authDomain: "afriziaprod.firebaseapp.com",
  projectId: "afriziaprod",
  storageBucket: "afriziaprod.firebasestorage.app",
  messagingSenderId: "609959722693",
  appId: "1:609959722693:web:e075d926353c99358ffaac",
  measurementId: "G-74R2400BTG"
};

// scroll
const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
}

const inMemoryScrollingFeatures: InMemoryScrollingFeature =
  withInMemoryScrolling(scrollConfig)

export const appConfig: ApplicationConfig = {
  providers: [
    FakeBackendProvider,
    DatePipe,
    DecimalPipe,
    provideZoneChangeDetection({
      eventCoalescing: false,
      runCoalescing: false,
      ignoreChangesOutsideZone: true,
    }),
    provideRouter(routes, inMemoryScrollingFeatures),
    provideStore(rootReducer),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideEffects(CalendarEffects),
    provideEffects(AuthenticationEffects, KanbanEffects),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideAnimations(),
    importProvidersFrom(NgbModule),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore())
  ],
}
