import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // Untuk *ngIf, async pipe
import { Router, RouterLink } from '@angular/router'; // Untuk navigasi
import { Subscription, Observable, of, combineLatest } from 'rxjs'; // Import RxJS
import { switchMap, map, catchError, shareReplay } from 'rxjs/operators';

// Import Firebase services
import { Auth, user, signOut, User } from '@angular/fire/auth'; // user, signOut, User
import { Firestore, doc, getDoc, collection, query, where, getCountFromServer } from '@angular/fire/firestore';

// Import interface UserProfile
import { UserProfile } from '../../models/user-profile.model'; // Sesuaikan path

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  // Inject services
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private router: Router = inject(Router);

  // Observable untuk data user profile dari Firestore
  userProfile$: Observable<UserProfile | null> | null = null;
  // Observable untuk jumlah postingan
  postCount$: Observable<number> | null = null;
  // Observable untuk email dari Auth
  userEmail$: Observable<string | null> | null = null;

  // Default profile image
  defaultProfilePic = 'assets/ic_person.svg'; // Ganti dengan path placeholder Anda

  ngOnInit(): void {
    // Gunakan user observable dari Auth untuk mendapatkan user saat ini
    this.userProfile$ = user(this.auth).pipe(
      switchMap(currentUser => {
        if (currentUser) {
          this.userEmail$ = of(currentUser.email); // Simpan email dari Auth
          // Jika user login, ambil data profil dari Firestore
          const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);
          return getDoc(userDocRef).then(docSnap => {
            if (docSnap.exists()) {
              // Gabungkan data dari Firestore dengan uid
              return { uid: currentUser.uid, ...docSnap.data() } as UserProfile;
            } else {
              console.warn(`Profile document not found for UID: ${currentUser.uid}`);
              // Kembalikan data minimal jika dokumen tidak ditemukan
              return { uid: currentUser.uid, email: currentUser.email, username: 'N/A' } as UserProfile;
            }
          });
        } else {
          // Jika tidak ada user login, kembalikan null
          this.userEmail$ = of(null);
          return of(null);
        }
      }),
      catchError(error => {
        console.error("Error fetching user profile:", error);
        return of(null); // Kembalikan null jika ada error
      }),
      shareReplay(1) // Cache hasil terakhir dan bagikan ke subscriber baru
    );

    // Ambil jumlah postingan berdasarkan user ID
    this.postCount$ = user(this.auth).pipe(
      switchMap(currentUser => {
        if (currentUser) {
          const messagesCollectionRef = collection(this.firestore, 'messages');
          const q = query(messagesCollectionRef, where('senderId', '==', currentUser.uid));
          return getCountFromServer(q).then(snapshot => snapshot.data().count);
        } else {
          return of(0); // Kembalikan 0 jika tidak login
        }
      }),
      catchError(error => {
        console.error("Error fetching post count:", error);
        return of(0); // Kembalikan 0 jika ada error
      }),
      shareReplay(1) // Cache hasil terakhir
    );
  }

  // Fungsi untuk logout
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('User logged out successfully');
      this.router.navigate(['/login']); // Arahkan ke login setelah logout
    } catch (error) {
      console.error('Logout failed:', error);
      // Tampilkan pesan error ke pengguna jika perlu
    }
  }

  // Fungsi untuk navigasi ke halaman edit profile
  goToEditProfile(): void {
    this.router.navigate(['/edit-profile']);
  }

   // Fungsi untuk menangani error saat gambar profil gagal dimuat
   onProfileImageError(event: Event): void {
    console.warn('Profile image failed to load, using default.');
    (event.target as HTMLImageElement).src = this.defaultProfilePic;
   }
}
