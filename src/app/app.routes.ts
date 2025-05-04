import { Routes } from '@angular/router';

// Impor komponen halaman (pastikan path impor benar)
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { CreateComponent } from './pages/create/create.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component';
import { DetailMessageComponent } from './pages/detail-message/detail-message.component';
import { SuccessComponent } from './pages/success/success.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Rute untuk halaman login dan register (di luar layout utama)
  { path: 'login', component: LoginComponent, title: 'Login' }, // Tambahkan title (opsional, bagus untuk aksesibilitas)
  { path: 'register', component: RegisterComponent, title: 'Register' },
  { path: 'success', component: SuccessComponent, title: 'Success' },

  // Rute utama yang menggunakan MainLayoutComponent
  // Semua rute di dalam children ini akan ditampilkan di dalam MainLayout
  {
    path: '', // Path kosong (root URL) akan masuk ke layout utama
    component: MainLayoutComponent,
    canActivate: [authGuard], // <-- Aktifkan ini nanti setelah Auth Guard dibuat
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' }, // Redirect dari root ke home
      { path: 'home', component: HomeComponent, title: 'Home' },
      { path: 'create', component: CreateComponent, title: 'Create Message' },
      { path: 'profile', component: ProfileComponent, title: 'Profile' },
      { path: 'edit-profile', component: EditProfileComponent, title: 'Edit Profile' },
      { path: 'message/:id', component: DetailMessageComponent, title: 'Message Detail' }, // Rute untuk detail pesan dengan ID
      // Tambahkan rute lain di dalam layout ini jika perlu
    ]
  },

  // Fallback route jika URL tidak cocok (opsional, bisa diarahkan ke halaman 404 atau home)
  { path: '**', redirectTo: 'login' } // Jika tidak cocok, arahkan ke login
];
