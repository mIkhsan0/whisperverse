import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

// Definisikan interface sesuai dengan respons API Anda
export interface UserProfileFromFirestore { // Data yang disimpan di Firestore
  userId: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  numberOfPosts: number;
  otherAccountDetails: {
    photoURL: string;
    userDescription: string;
    userLocation: string;
  };
  // Tambahkan properti lain jika ada
}

export interface RegisterResponse {
  message: string;
  userId: string;
  email: string;
}

export interface LoginResponse { // Sesuai dengan respons dari backend /login Anda
  message: string;
  idToken: string;
  refreshToken: string;
  localId: string; // Ini adalah Firebase UID
  expiresIn: string; // Dalam detik
}

export interface ProfileResponse {
  message: string;
  userProfile: UserProfileFromFirestore;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:3000/api/auth';

  // BehaviorSubject untuk menyimpan data pengguna yang sedang login (dari Firestore)
  private currentUserProfileSubject = new BehaviorSubject<UserProfileFromFirestore | null>(null);
  public currentUserProfile$ = this.currentUserProfileSubject.asObservable();

  // BehaviorSubject untuk status loading (opsional, untuk UI)
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  // Menyimpan token
  private idToken: string | null = null;
  private refreshTokenKey = 'app_refreshToken'; // Kunci untuk localStorage refreshToken



  constructor(private http: HttpClient,private router: Router) {
    this.loadUserFromStorageAndFetchProfile();
  }

  private async loadUserFromStorageAndFetchProfile(): Promise<void> {
    const storedIdToken = localStorage.getItem('app_idToken');
    if (storedIdToken) {
      this.idToken = storedIdToken;
      // Anda bisa menambahkan logika untuk memeriksa apakah token kedaluwarsa
      // dan menggunakan refreshToken jika perlu (logika refresh token lebih kompleks)
      this.fetchAndSetUserProfile().subscribe();
    }
  }

  // Helper untuk mendapatkan HttpHeaders dengan Firebase ID Token
  public getAuthHeaders(): HttpHeaders {
    if (this.idToken) {
      return new HttpHeaders().set('Authorization', `Bearer ${this.idToken}`);
    }
    return new HttpHeaders(); // Kembalikan header kosong jika tidak ada token
  }

  // --- METODE AUTENTIKASI ---

  // POST /api/auth/register
  register(userData: any): Observable<RegisterResponse> {
    this.isLoadingSubject.next(true);
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, userData).pipe(
      tap(() => this.isLoadingSubject.next(false)),
      catchError(err => {
        this.isLoadingSubject.next(false);
        throw err; // Teruskan error untuk ditangani di komponen
      })
    );
  }

  // POST /api/auth/login
  login(credentials: any): Observable<LoginResponse> {
    this.isLoadingSubject.next(true);
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.idToken) {
          this.idToken = response.idToken;
          localStorage.setItem('app_idToken', response.idToken);
          localStorage.setItem(this.refreshTokenKey, response.refreshToken);
          // Setelah login, ambil profil pengguna dari backend
          this.fetchAndSetUserProfile().subscribe();
        }
        this.isLoadingSubject.next(false);
      }),
      catchError(err => {
        this.isLoadingSubject.next(false);
        this.clearAuthData(); // Bersihkan data jika login gagal
        throw err;
      })
    );
  }

  // GET /api/auth/profile
  // Dipanggil setelah login atau saat inisialisasi jika ada token
  fetchAndSetUserProfile(): Observable<UserProfileFromFirestore | null> {
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
      this.clearAuthData(); // Token tidak ada, pastikan logout
      return of(null);
    }

    this.isLoadingSubject.next(true);
    return this.http.get<ProfileResponse>(`${this.baseUrl}/profile`, { headers }).pipe(
      tap(response => {
        if (response && response.userProfile) {
          this.currentUserProfileSubject.next(response.userProfile);
        } else {
          // Jika profil tidak ditemukan meski token ada, mungkin token tidak valid lagi
          this.clearAuthData();
        }
        this.isLoadingSubject.next(false);
      }),
      switchMap(response => of(response ? response.userProfile : null)), // Kembalikan hanya userProfile
      catchError(err => {
        console.error('Gagal mengambil profil:', err);
        this.clearAuthData(); // Bersihkan data jika gagal ambil profil (mis. token expired)
        this.isLoadingSubject.next(false);
        // Tidak perlu throw error di sini agar tidak menghentikan alur jika ini adalah pemanggilan latar belakang
        return of(null);
      })
    );
  }

  // Metode untuk logout
  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']); // Arahkan ke halaman login
    // Jika Anda perlu memberitahu backend tentang logout (misalnya, invalidate refresh token),
    // Anda bisa menambahkan panggilan API di sini.
  }

  private clearAuthData(): void {
    this.idToken = null;
    this.currentUserProfileSubject.next(null);
    localStorage.removeItem('app_idToken');
    localStorage.removeItem(this.refreshTokenKey);
  }

  // Helper untuk memeriksa status login
  isAuthenticated(): boolean {
    return !!this.idToken && !!this.currentUserProfileSubject.value;
  }

  // Mendapatkan nilai UserProfile saat ini (non-observable)
  getCurrentUserProfile(): UserProfileFromFirestore | null {
    return this.currentUserProfileSubject.value;
  }

  // Mendapatkan ID Token saat ini (jika diperlukan oleh service lain secara langsung)
  getCurrentIdToken(): string | null {
    return this.idToken;
  }

  // Logika untuk Refresh Token (Contoh Sederhana, perlu diimplementasikan dengan lebih cermat)
  // Ini bisa dipanggil oleh interceptor HTTP jika request gagal karena token expired (401)
  /*
  refreshToken(): Observable<string | null> {
    const storedRefreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!storedRefreshToken) {
      this.logout(); // Tidak ada refresh token, paksa logout
      return throwError(() => new Error('No refresh token available'));
    }

    const firebaseWebApiKey = 'YOUR_FIREBASE_WEB_API_KEY'; // Perlu API Key di sini
    const refreshUrl = `https://securetoken.googleapis.com/v1/token?key=${firebaseWebApiKey}`;

    return this.http.post<any>(refreshUrl, {
      grant_type: 'refresh_token',
      refresh_token: storedRefreshToken
    }).pipe(
      tap(response => {
        this.idToken = response.id_token; // Perhatikan nama field dari Firebase: id_token
        localStorage.setItem('app_idToken', response.id_token);
        // Firebase mungkin juga mengembalikan refresh token baru, tapi seringnya tidak untuk flow ini
        // localStorage.setItem(this.refreshTokenKey, response.refresh_token);
        console.log('Token berhasil di-refresh');
      }),
      map(response => response.id_token),
      catchError(err => {
        console.error('Gagal me-refresh token:', err);
        this.logout(); // Gagal refresh, paksa logout
        return throwError(() => err);
      })
    );
  }
  */

}
