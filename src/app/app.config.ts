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
import { DatePipe, DecimalPipe, HashLocationStrategy, LocationStrategy } from '@angular/common'
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
import { AuthModalService } from './core/services/auth-modal.service'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { StaticTranslateLoader } from './shared/config/translation.config'
import { environment } from '@/environments/environment'

const firebaseConfig =environment.firebaseConfig
const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
}

const inMemoryScrollingFeatures: InMemoryScrollingFeature =
  withInMemoryScrolling(scrollConfig)

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    },
    FakeBackendProvider,
    DatePipe,
    DecimalPipe,
    AuthModalService,
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
    provideFirestore(() => getFirestore()),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'fr',
        loader: {
          provide: TranslateLoader,
          useClass: StaticTranslateLoader
        }
      })
    )
  ],
}
