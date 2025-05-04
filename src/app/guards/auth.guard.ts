import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth'; // Import Auth dan authState
import { map, take, tap } from 'rxjs/operators'; // Import operator RxJS
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const auth: Auth = inject(Auth); // Inject Firebase Auth service
  const router: Router = inject(Router); // Inject Router service

  // authState adalah Observable yang memancarkan status user (User atau null)
  return authState(auth).pipe(
    take(1), // Ambil nilai pertama (status saat ini) dan unsubscribe
    map(user => !!user), // Ubah user menjadi boolean (true jika ada user, false jika null)
    tap(isLoggedIn => {
      if (!isLoggedIn) {
        console.log('Auth Guard: User not logged in, redirecting to /login');
        // Jika tidak login, arahkan ke halaman login
        router.navigate(['/login']);
      } else {
        console.log('Auth Guard: User is logged in, allowing access.');
      }
    })
  );
};
