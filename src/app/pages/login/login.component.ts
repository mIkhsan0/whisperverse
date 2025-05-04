import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router'; // Import Router dan RouterLink
import { FormsModule } from '@angular/forms'; // Import FormsModule untuk [(ngModel)]
import { CommonModule } from '@angular/common'; // Import CommonModule untuk *ngIf

// Import Firebase Auth related functions and types
import { Auth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from '@angular/fire/auth';

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
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);

  // Properti untuk two-way data binding dengan form
  email = '';
  password = '';

  // Properti untuk menampilkan pesan error dan status loading
  loginError: string | null = null;
  isLoading = false;

  ngOnInit(): void {
    // Cek status auth saat komponen dimuat
    // Jika sudah login, langsung redirect ke home
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        console.log('User already logged in, redirecting to home.');
        this.router.navigate(['/home']);
      } else {
        console.log('No user logged in.');
      }
    });
  }


  // Fungsi untuk login dengan email dan password
  async loginWithEmail(): Promise<void> {
    if (this.isLoading) return; // Jangan proses jika sedang loading
    this.isLoading = true;
    this.loginError = null; // Reset error

    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
      console.log('Login successful:', userCredential.user);
      // Arahkan ke halaman utama setelah login berhasil
      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Login failed:', error);
      // Tampilkan pesan error yang lebih user-friendly
      this.loginError = this.mapAuthCodeToMessage(error.code);
    } finally {
      this.isLoading = false; // Set loading selesai
    }
  }

  // Fungsi untuk login dengan Google
  async loginWithGoogle(): Promise<void> {
     if (this.isLoading) return;
     this.isLoading = true;
     this.loginError = null;

    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(this.auth, provider);
      console.log('Google Sign-In successful:', userCredential.user);
       // TODO: Nanti tambahkan logika untuk cek apakah user baru
       // dan simpan data ke Firestore jika perlu (seperti di Android)
      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      this.loginError = `Google Sign-In failed: ${error.message}`;
       // Handle specific Google errors if needed (e.g., popup closed)
      if (error.code === 'auth/popup-closed-by-user') {
        this.loginError = 'Proses login Google dibatalkan.';
      } else {
         this.loginError = this.mapAuthCodeToMessage(error.code);
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
