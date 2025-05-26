import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router'; // Import Router dan RouterLink
import { FormsModule } from '@angular/forms'; // Import FormsModule untuk [(ngModel)]
import { CommonModule } from '@angular/common'; // Import CommonModule untuk *ngIf

// Import Firebase Auth related functions and types
//import { Auth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from '@angular/fire/auth';

// Import AuthService kita
import { AuthService, LoginResponse } from '../../services/auth.service';

// Import Firebase Auth untuk Google Login (jika masih ingin digunakan secara client-side)
// dan untuk onAuthStateChanged jika masih dipakai
import { Auth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  // Impor modul yang diperlukan oleh template
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] // Perhatikan .scss
})

export class LoginComponent implements OnInit {
  // Inject Firebase Auth service dan Angular Router
  // private auth: Auth = inject(Auth);
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private afAuth: Auth = inject(Auth);

  email = '';
  password = '';
  loginError: string | null = null;
  isLoading = false;

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      console.log('LoginComponent (AuthService check): User already authenticated, redirecting to home.');
      this.router.navigate(['/home']);
      return;
    }

    // // Cek status auth saat komponen dimuat
    // // Jika sudah login, langsung redirect ke home
    // onAuthStateChanged(this.auth, (user) => {
    //   if (user) {
    //     console.log('User already logged in, redirecting to home.');
    //     this.router.navigate(['/home']);
    //   } else {
    //     console.log('No user logged in.');
    //   }
    // });
  }


  // Fungsi untuk login dengan email dan password
  async loginWithEmail(): Promise<void> {
    if (this.isLoading || !this.email || !this.password) {
      // Tambahkan validasi dasar di sini jika form belum tentu valid saat submit
      if (!this.email || !this.password) {
        this.loginError = "Email dan password tidak boleh kosong.";
      }
      return;
    }; // Jangan proses jika sedang loading
    this.isLoading = true;
    this.loginError = null; // Reset error

    this.authService.login({ email: this.email, password: this.password })
      .subscribe({
        next: (response: LoginResponse) => { // Type response sesuai dengan yang di AuthService
          console.log('Login successful via AuthService:', response);
          // AuthService sudah menangani penyimpanan token dan pengambilan profil pengguna.
          // Langsung arahkan ke halaman utama.
          this.router.navigate(['/home']);
        },
        error: (error: any) => {
          console.error('Login failed via AuthService:', error);
          if (error.status === 401) {
            this.loginError = error.error?.message || 'Email atau password salah.';
          } else if (error.status === 0 || error.status === 504) {
            this.loginError = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
          } else {
            this.loginError = error.error?.message || 'Terjadi kesalahan saat login. Silakan coba lagi.';
          }
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    // try {
    //   const userCredential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
    //   console.log('Login successful:', userCredential.user);
    //   // Arahkan ke halaman utama setelah login berhasil
    //   this.router.navigate(['/home']);
    // } catch (error: any) {
    //   console.error('Login failed:', error);
    //   // Tampilkan pesan error yang lebih user-friendly
    //   this.loginError = this.mapAuthCodeToMessage(error.code);
    // } finally {
    //   this.isLoading = false; // Set loading selesai
    // }
  }

  // // Fungsi untuk login dengan Google
  // async loginWithGoogle(): Promise<void> {
  //    if (this.isLoading) return;
  //    this.isLoading = true;
  //    this.loginError = null;

  //   const provider = new GoogleAuthProvider();
  //   try {
  //     const userCredential = await signInWithPopup(this.auth, provider);
  //     console.log('Google Sign-In successful:', userCredential.user);
  //      // TODO: Nanti tambahkan logika untuk cek apakah user baru
  //      // dan simpan data ke Firestore jika perlu (seperti di Android)
  //     this.router.navigate(['/home']);
  //   } catch (error: any) {
  //     console.error('Google Sign-In failed:', error);
  //     this.loginError = `Google Sign-In failed: ${error.message}`;
  //      // Handle specific Google errors if needed (e.g., popup closed)
  //     if (error.code === 'auth/popup-closed-by-user') {
  //       this.loginError = 'Proses login Google dibatalkan.';
  //     } else {
  //        this.loginError = this.mapAuthCodeToMessage(error.code);
  //     }
  //   } finally {
  //     this.isLoading = false;
  //   }
  // }

  // Fungsi loginWithGoogle tetap menggunakan Firebase client-side untuk mendapatkan token
  async loginWithGoogle(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    this.loginError = null;

    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(this.afAuth, provider);
      console.log('Google Sign-In successful (client-side):', userCredential.user);

      // PENTING: Setelah login Google client-side berhasil, dapatkan idToken
      // dan sampaikan ke AuthService agar ia sadar dan bisa digunakan untuk API backend
      const idToken = await userCredential.user.getIdToken();
      if (idToken) {
        this.authService.setFirebaseToken(idToken); // Metode ini perlu ada di AuthService
        // Setelah token diset, AuthService bisa otomatis memuat profil jika dirancang demikian,
        // atau Anda bisa panggil fetchProfile secara manual di sini jika perlu.
        // Untuk konsistensi, setelah setFirebaseToken, AuthService.loadUserFromStorageAndFetchProfile
        // (jika dipanggil dari setFirebaseToken) atau fetchAndSetUserProfile harusnya berjalan.
        
        // Kemudian, navigasi
        console.log('Google Sign-In: ID Token set in AuthService. Navigating to home.');
        this.router.navigate(['/home']);
      } else {
        throw new Error('Gagal mendapatkan ID Token dari Google Sign-In.');
      }

    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      this.authService.setFirebaseToken(null); // Pastikan token dibersihkan jika gagal
      if (error.code === 'auth/popup-closed-by-user') {
        this.loginError = 'Proses login Google dibatalkan.';
      } else {
        this.loginError = this.mapAuthCodeToMessage(error.code || error.message);
      }
    } finally {
      this.isLoading = false;
    }
  }

  // Helper function untuk memetakan kode error Firebase ke pesan yang lebih mudah dimengerti
  private mapAuthCodeToMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'Format email tidak valid.';
      case 'auth/user-disabled':
        return 'Akun pengguna ini telah dinonaktifkan.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': // Kode error baru untuk kredensial tidak valid
        return 'Email atau password salah.';
      case 'auth/too-many-requests':
        return 'Terlalu banyak percobaan login. Coba lagi nanti.';
      case 'auth/network-request-failed':
        return 'Gagal terhubung ke jaringan. Periksa koneksi internet Anda.';
      default:
        return 'Terjadi kesalahan saat login. Silakan coba lagi.';
    }
  }
}
