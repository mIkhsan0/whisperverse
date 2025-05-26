import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Import Firebase Auth
// import { Auth, createUserWithEmailAndPassword, UserCredential } from '@angular/fire/auth';
// Import Firestore
// import { Firestore, doc, setDoc } from '@angular/fire/firestore';

// Import AuthService kita
import { AuthService, RegisterResponse } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'] // Perhatikan .scss
})

export class RegisterComponent {
  // Inject AuthService dan Router
  private authService: AuthService = inject(AuthService); // Menggunakan AuthService kita
  private router: Router = inject(Router);

  // Form data binding properties
  email = '';
  username = ''; // Anda sudah memiliki ini
  password = '';
  // Jika Anda ingin menambahkan displayName di form registrasi, tambahkan di sini
  // displayName = '';

  // Error and loading state
  registerError: string | null = null;
  isLoading = false; // Anda sudah punya ini

  async registerUser(): Promise<void> {
    if (this.isLoading) return;

    // Validasi dasar di frontend (backend Anda juga memiliki validasi yang lebih kuat)
    if (!this.email || !this.username || !this.password) {
      this.registerError = 'Semua field (Email, Username, Password) wajib diisi.';
      return;
    }
    if (this.password.length < 8) { // Sesuai validasi backend Anda untuk panjang password
      this.registerError = 'Password harus minimal 8 karakter.';
      return;
    }
    // Anda bisa menambahkan validasi regex username di sini jika ingin,
    // tapi backend sudah menanganinya: /^[a-zA-Z0-9_]+$/

    this.isLoading = true;
    this.registerError = null;

    // Siapkan data untuk dikirim ke AuthService
    // Sesuaikan ini jika Anda menambahkan field displayName di form
    const registrationData = {
      email: this.email,
      password: this.password,
      username: this.username,
      displayName: this.username // Backend Anda menggunakan displayName || inputUsername,
                                // jadi bisa disamakan di sini atau biarkan backend yang handle
    };

    this.authService.register(registrationData)
      .subscribe({
        next: (response: RegisterResponse) => {
          console.log('Registrasi berhasil via AuthService:', response);
          // Backend Anda mengembalikan pesan sukses, userId, dan email.
          // Setelah registrasi, pengguna biasanya diarahkan ke halaman login
          // untuk masuk dengan akun yang baru dibuat.
          this.router.navigate(['/login'], { queryParams: { registrationSuccess: 'true' } });
          // Anda bisa menambahkan pesan sukses di halaman login menggunakan queryParams ini.
        },
        error: (error: any) => {
          console.error('Registrasi gagal via AuthService:', error);
          if (error.error && error.error.errors && Array.isArray(error.error.errors)) {
            // Jika backend mengembalikan array errors dari express-validator
            const firstError = error.error.errors[0];
            this.registerError = `${firstError.path}: ${firstError.msg}`;
          } else if (error.error && error.error.message) {
             // Jika backend mengembalikan pesan error tunggal
            this.registerError = error.error.message;
          } else {
            this.registerError = 'Terjadi kesalahan saat registrasi. Silakan coba lagi.';
          }
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  // Fungsi mapAuthCodeToMessage mungkin tidak lagi terlalu relevan jika error
  // utama datang dari backend Anda, tetapi bisa disimpan untuk referensi atau
  // jika ada error client-side lain.
  // private mapAuthCodeToMessage(code: string): string { ... }
}

// export class RegisterComponent {
//   // Inject services
//   private auth: Auth = inject(Auth);
//   private firestore: Firestore = inject(Firestore);
//   private router: Router = inject(Router);

//   // Form data binding properties
//   email = '';
//   username = '';
//   password = '';

//   // Error and loading state
//   registerError: string | null = null;
//   isLoading = false;

//   // Fungsi untuk registrasi user
//   async registerUser(): Promise<void> {
//     if (this.isLoading) return;
//     this.isLoading = true;
//     this.registerError = null;

//     // Validasi dasar tambahan (opsional, karena form sudah ada validasi)
//     if (!this.email || !this.username || !this.password) {
//       this.registerError = 'Semua field wajib diisi.';
//       this.isLoading = false;
//       return;
//     }
//     if (this.password.length < 6) {
//        this.registerError = 'Password minimal 6 karakter.';
//        this.isLoading = false;
//        return;
//     }

//     try {
//       // 1. Buat user di Firebase Authentication
//       const userCredential: UserCredential = await createUserWithEmailAndPassword(
//         this.auth,
//         this.email,
//         this.password
//       );
//       const user = userCredential.user;
//       console.log('User created in Auth:', user);

//       // 2. Simpan data user (username, email) ke Firestore
//       if (user) {
//         const userDocRef = doc(this.firestore, `users/${user.uid}`); // Referensi ke dokumen user dengan ID = UID
//         await setDoc(userDocRef, {
//           username: this.username,
//           email: this.email,
//           profileImageUrl: null // Inisialisasi profile image URL (opsional)
//           // Tambahkan field lain jika perlu, misal: createdAt: serverTimestamp()
//         });
//         console.log('User data saved to Firestore for UID:', user.uid);

//         // 3. Arahkan ke halaman Login setelah sukses
//         this.router.navigate(['/login']);
//         // Optional: Tampilkan pesan sukses singkat sebelum redirect (misal pakai Toast)

//       } else {
//         // Seharusnya tidak terjadi jika createUserWithEmailAndPassword sukses
//         throw new Error('User object is null after creation.');
//       }

//     } catch (error: any) {
//       console.error('Registration failed:', error);
//       this.registerError = this.mapAuthCodeToMessage(error.code);
//       // Jika error saat menyimpan ke Firestore (jarang terjadi jika Auth sukses)
//       if (error.message.includes('Firestore')) {
//          this.registerError = 'Gagal menyimpan data pengguna. Silakan coba lagi.';
//          // Pertimbangkan menghapus user Auth jika penyimpanan Firestore gagal (lebih kompleks)
//       }
//     } finally {
//       this.isLoading = false;
//     }
//   }

//   // Helper function untuk memetakan kode error Firebase Auth
//   private mapAuthCodeToMessage(code: string): string {
//     switch (code) {
//       case 'auth/email-already-in-use':
//         return 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.';
//       case 'auth/invalid-email':
//         return 'Format email tidak valid.';
//       case 'auth/operation-not-allowed':
//         return 'Registrasi dengan email/password belum diaktifkan.'; // Cek Firebase Console
//       case 'auth/weak-password':
//         return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
//        case 'auth/network-request-failed':
//         return 'Gagal terhubung ke jaringan. Periksa koneksi internet Anda.';
//       default:
//         return 'Terjadi kesalahan saat registrasi. Silakan coba lagi.';
//     }
//   }
// }
