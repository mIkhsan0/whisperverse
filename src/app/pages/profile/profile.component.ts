import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // Untuk *ngIf, async pipe
import { Router, RouterLink } from '@angular/router'; // Untuk navigasi
import { Subscription, Observable, of, combineLatest } from 'rxjs'; // Import RxJS
import { tap } from 'rxjs/operators';

// // Import Firebase services
// import { Auth, user, signOut, User } from '@angular/fire/auth'; // user, signOut, User
// import { Firestore, doc, getDoc, collection, query, where, getCountFromServer } from '@angular/fire/firestore';

// Import AuthService dan UserProfile interface
import { AuthService, UserProfileFromFirestore } from '../../services/auth.service';

// // Import interface UserProfile
// import { UserProfile } from '../../models/user-profile.model'; // Sesuaikan path

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})

export class ProfileComponent implements OnInit {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);

  userProfile$: Observable<UserProfileFromFirestore | null>;
  isLoading$: Observable<boolean>; // Untuk menampilkan indikator loading

  defaultProfilePic = 'assets/ic_person.svg'; // Path ke gambar placeholder Anda

  constructor() {
    this.userProfile$ = this.authService.currentUserProfile$.pipe(
      tap(profile => {
        console.log('ProfileComponent - Received profile from AuthService:', profile);
      })
    );
    this.isLoading$ = this.authService.isLoading$; // Gunakan isLoading$ dari AuthService
  }

  ngOnInit(): void {
    // Cek jika profil null dan ada token, coba fetch lagi (AuthService sudah melakukan ini saat init)
    // Jadi, mungkin tidak perlu logika fetch eksplisit di sini kecuali untuk kasus khusus.
    if (!this.authService.getCurrentUserProfile() && this.authService.getCurrentIdToken()) {
      console.log('ProfileComponent: Profile is null but token exists, attempting re-fetch.');
      this.authService.fetchAndSetUserProfile().subscribe();
    }
  }

  logout(): void {
    this.authService.logout();
  }

  goToEditProfile(): void {
    this.router.navigate(['/edit-profile']);
  }

  // Fungsi untuk menangani error saat gambar profil gagal dimuat
  onProfileImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement.src !== this.defaultProfilePic) {
      imgElement.src = this.defaultProfilePic;
    }
  }
}

// export class ProfileComponent implements OnInit {
//   // Inject services
//   private auth: Auth = inject(Auth);
//   private firestore: Firestore = inject(Firestore);
//   private router: Router = inject(Router);

//   // Observable untuk data user profile dari Firestore
//   userProfile$: Observable<UserProfile | null> | null = null;
//   // Observable untuk jumlah postingan
//   postCount$: Observable<number> | null = null;
//   // Observable untuk email dari Auth
//   userEmail$: Observable<string | null> | null = null;

//   // Default profile image
//   defaultProfilePic = 'assets/ic_person.svg'; // Ganti dengan path placeholder Anda
//   profileImageUrl: string = this.defaultProfilePic; // URL gambar profil

//   ngOnInit(): void {
//     // Gunakan user observable dari Auth untuk mendapatkan user saat ini
//     this.userProfile$ = user(this.auth).pipe(
//       switchMap(currentUser => {
//         if (currentUser) {
//           this.userEmail$ = of(currentUser.email);
//           const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);
//           return getDoc(userDocRef).then(docSnap => {
//             let profile: UserProfile;
//             if (docSnap.exists()) {
//               profile = { uid: currentUser.uid, ...docSnap.data() } as UserProfile;
//             } else {
//               profile = { uid: currentUser.uid, email: currentUser.email, username: 'N/A' } as UserProfile;
//             }
//             // Set profile image URL or default
//             this.profileImageUrl = profile.profileImageUrl || this.defaultProfilePic;
//             return profile;
//           });
//         } else {
//           this.userEmail$ = of(null);
//           this.profileImageUrl = this.defaultProfilePic;
//           return of(null);
//         }
//       }),
//       catchError(error => {
//         console.error("Error fetching user profile:", error);
//         return of(null); // Kembalikan null jika ada error
//       }),
//       shareReplay(1) // Cache hasil terakhir dan bagikan ke subscriber baru
//     );

//     // Ambil jumlah postingan berdasarkan user ID
//     this.postCount$ = user(this.auth).pipe(
//       switchMap(currentUser => {
//         if (currentUser) {
//           const messagesCollectionRef = collection(this.firestore, 'messages');
//           const q = query(messagesCollectionRef, where('senderId', '==', currentUser.uid));
//           return getCountFromServer(q).then(snapshot => snapshot.data().count);
//         } else {
//           return of(0); // Kembalikan 0 jika tidak login
//         }
//       }),
//       catchError(error => {
//         console.error("Error fetching post count:", error);
//         return of(0); // Kembalikan 0 jika ada error
//       }),
//       shareReplay(1) // Cache hasil terakhir
//     );
//   }

//   // Fungsi untuk logout
//   async logout(): Promise<void> {
//     try {
//       await signOut(this.auth);
//       console.log('User logged out successfully');
//       this.router.navigate(['/login']); // Arahkan ke login setelah logout
//     } catch (error) {
//       console.error('Logout failed:', error);
//       // Tampilkan pesan error ke pengguna jika perlu
//     }
//   }

//   // Fungsi untuk navigasi ke halaman edit profile
//   goToEditProfile(): void {
//     this.router.navigate(['/edit-profile']);
//   }

//    // Fungsi untuk menangani error saat gambar profil gagal dimuat
//    onProfileImageError(event: Event): void {
//     if (this.profileImageUrl !== this.defaultProfilePic) {
//       this.profileImageUrl = this.defaultProfilePic;
//     }
//   }
// }
