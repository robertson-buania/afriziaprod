import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { getisLoggedIn } from '@/app/store/authentication/authentication.selector';
import { map } from 'rxjs';

export const AuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const store = inject(Store);

  return store.select(getisLoggedIn).pipe(
    map(isLoggedIn => {
      if (isLoggedIn) {
        return true;
      }

      // Rediriger vers la page de connexion avec l'URL de retour
      router.navigate(['/auth/log-in'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    })
  );
};
