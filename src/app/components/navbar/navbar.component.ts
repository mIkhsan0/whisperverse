import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Untuk *ngIf / [class.open]
import { Router, RouterLink, RouterLinkActive } from '@angular/router'; // Impor RouterLink/Active
import { Auth, signOut } from '@angular/fire/auth'; // Impor Auth dan signOut

@Component({
  selector: 'app-navbar',
  standalone: true,
  // Impor modul yang dibutuhkan oleh template
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);

  isMobileMenuOpen = false; // State untuk menu mobile

  // Fungsi untuk toggle menu mobile
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  // Fungsi untuk menutup menu mobile (dipanggil saat link diklik)
  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  // Fungsi untuk logout
  async logout(): Promise<void> {
    this.closeMobileMenu(); // Tutup menu jika terbuka
    try {
      await signOut(this.auth);
      console.log('User logged out successfully from Navbar');
      this.router.navigate(['/login']); // Arahkan ke login setelah logout
    } catch (error) {
      console.error('Navbar logout failed:', error);
      // Tampilkan pesan error ke pengguna jika perlu
    }
  }
}
