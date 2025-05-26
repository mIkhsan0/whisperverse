import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
// import { Auth, authState } from '@angular/fire/auth'; // Import Auth dan authState
import { map, catchError, tap, first, take } from 'rxjs/operators'; // Import operator RxJS
import { Observable, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Cek status autentikasi dari AuthService
  if (authService.isAuthenticated()) {
    // Jika sudah terautentikasi secara sinkron (misalnya, token ada dan profil sudah dimuat)
    console.log('AuthGuard: User is authenticated (synchronous check). Allowing access.');
    return true;
  } else {
    // Jika status autentikasi belum pasti atau bergantung pada pemanggilan profil asinkron
    // setelah memuat token dari localStorage, kita bisa menggunakan currentUserProfile$
    // atau mencoba memuat ulang profil jika token ada tapi profil belum.
    // Untuk kasus di mana token ada tapi profil belum dimuat (misalnya setelah refresh halaman),
    // AuthService kita di constructor memanggil loadUserFromStorageAndFetchProfile().
    // Kita bisa menunggu hasilnya.

    // Ambil token saat ini (mungkin sudah dimuat dari localStorage oleh constructor AuthService)
    const currentToken = authService.getCurrentIdToken();

    if (currentToken) {
      // Jika token ada, tapi isAuthenticated() false (mungkin karena currentUserProfile belum ada),
      // coba panggil fetchAndSetUserProfile untuk memastikan.
      // Ini berguna untuk kasus setelah refresh halaman di mana token ada di localStorage.
      console.log('AuthGuard: Token exists, attempting to fetch profile to confirm auth status.');
      return authService.fetchAndSetUserProfile().pipe(
        map(userProfile => {
          if (userProfile) {
            console.log('AuthGuard: Profile fetched successfully. User is authenticated. Allowing access.');
            return true;
          } else {
            console.warn('AuthGuard: Token exists, but profile fetch failed or user not found. Redirecting to login.');
            authService.logout(); // Pastikan data auth dibersihkan jika profil tidak valid
            router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            return false;
          }
        }),
        catchError(() => {
          console.error('AuthGuard: Error fetching profile. Redirecting to login.');
          authService.logout(); // Pastikan data auth dibersihkan jika profil tidak valid
          router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return of(false);
        })
      );
    } else {
      // Tidak ada token, pasti tidak terautentikasi
      console.log('AuthGuard: No token found. User is not authenticated. Redirecting to login.');
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
  }
};

// export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
//   const auth: Auth = inject(Auth); // Inject Firebase Auth service
//   const router: Router = inject(Router); // Inject Router service

//   // authState adalah Observable yang memancarkan status user (User atau null)
//   return authState(auth).pipe(
//     take(1), // Ambil nilai pertama (status saat ini) dan unsubscribe
//     map(user => !!user), // Ubah user menjadi boolean (true jika ada user, false jika null)
//     tap(isLoggedIn => {
//       if (!isLoggedIn) {
//         console.log('Auth Guard: User not logged in, redirecting to /login');
//         // Jika tidak login, arahkan ke halaman login
//         router.navigate(['/login']);
//       } else {
//         console.log('Auth Guard: User is logged in, allowing access.');
//       }
//     })
//   );
// };
