import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Untuk *ngIf / [class.open]
import { Router, RouterLink, RouterLinkActive } from '@angular/router'; // Impor RouterLink/Active
//import { Auth, signOut } from '@angular/fire/auth'; // Impor Auth dan signOut
import { AuthService, UserProfileFromFirestore } from '../../services/auth.service'; // Impor AuthService
import { Observable } from 'rxjs';
@Component({
  selector: 'app-navbar',
  standalone: true,
  // Impor modul yang dibutuhkan oleh template
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})

export class NavbarComponent implements OnInit {
  // Inject AuthService dan Router
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router); // Router sudah ada

  isMobileMenuOpen = false;
  currentUser$: Observable<UserProfileFromFirestore | null>; // Untuk menampilkan info user

  constructor() {
    this.currentUser$ = this.authService.currentUserProfile$;
  }

  ngOnInit(): void {
    // Anda bisa subscribe ke currentUser$ di sini jika perlu melakukan sesuatu saat user berubah,
    // tapi biasanya async pipe di template sudah cukup.
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout(); // Panggil logout dari AuthService
    // Navigasi ke login sudah dihandle di dalam authService.logout()
    console.log('User logged out successfully from Navbar via AuthService');
  }
}


// export class NavbarComponent {
//   private auth: Auth = inject(Auth);
//   private router: Router = inject(Router);

//   isMobileMenuOpen = false; // State untuk menu mobile

//   // Fungsi untuk toggle menu mobile
//   toggleMobileMenu(): void {
//     this.isMobileMenuOpen = !this.isMobileMenuOpen;
//   }

//   // Fungsi untuk menutup menu mobile (dipanggil saat link diklik)
//   closeMobileMenu(): void {
//     this.isMobileMenuOpen = false;
//   }

//   // Fungsi untuk logout
//   async logout(): Promise<void> {
//     this.closeMobileMenu(); // Tutup menu jika terbuka
//     try {
//       await signOut(this.auth);
//       console.log('User logged out successfully from Navbar');
//       this.router.navigate(['/login']); // Arahkan ke login setelah logout
//     } catch (error) {
//       console.error('Navbar logout failed:', error);
//       // Tampilkan pesan error ke pengguna jika perlu
//     }
//   }
// }
