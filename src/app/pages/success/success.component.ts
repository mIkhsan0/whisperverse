import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Diperlukan jika menggunakan *ngIf dll. di template

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule], // Impor CommonModule
  templateUrl: './success.component.html',
  styleUrls: ['./success.component.scss']
})
export class SuccessComponent {
  private router: Router = inject(Router);

  /**
   * Navigasi kembali ke halaman Home.
   */
  goToHome(): void {
    this.router.navigate(['/home']);
  }
}
