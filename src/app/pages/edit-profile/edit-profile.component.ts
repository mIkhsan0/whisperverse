import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of, BehaviorSubject } from 'rxjs'; // Import BehaviorSubject
import { switchMap, catchError, tap, first, finalize } from 'rxjs/operators'; // Import finalize

// Import Firebase services
import { Auth, user, updatePassword, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, DocumentReference, DocumentData } from '@angular/fire/firestore'; // Import DocumentData

// Import interface UserProfile
import { UserProfile } from '../../models/user-profile.model'; // Sesuaikan path

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit, OnDestroy {
  // Inject services
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private router: Router = inject(Router);

  // Current user state
  currentUser: User | null = null;
  private userSubscription: Subscription | null = null;
  private userDocRef: DocumentReference<DocumentData> | null = null; // Gunakan DocumentData awal

  // Form data binding properties
  email: string | null = null;
  username: string = '';
  newPassword = '';

  // Original data for comparison
  originalUsername: string = '';
  currentProfileImageUrl: string | null = null;

  // Image handling
  selectedFile: File | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;
  defaultProfilePic = 'assets/ic_person.svg';
  profileImageUrl: string = this.defaultProfilePic;

  // --- State variables ---
  // Gunakan BehaviorSubject untuk loading data awal
  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  isLoading$ = this.isLoadingSubject.asObservable(); // Observable untuk digunakan di template

  isSaving = false; // Untuk proses simpan
  errorMessage: string | null = null;
  // ----------------------

  // --- Konfigurasi Cloudinary (SAMA seperti di CreateComponent) ---
  readonly cloudinaryCloudName = 'ds7cudqcp'; // Ganti dengan nama cloud Anda
  readonly cloudinaryUploadPreset = 'android_unsigned_upload'; // Ganti dengan preset Anda
  readonly cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`;
  // -----------------------------------------

  ngOnInit(): void {
    console.log("EditProfileComponent: ngOnInit - Starting data fetch.");
    this.isLoadingSubject.next(true); // Mulai loading
    this.errorMessage = null; // Reset error

    this.userSubscription = user(this.auth).pipe(
      first(), // Ambil user pertama kali saja
      tap(authUser => console.log("EditProfileComponent: Auth user fetched:", authUser?.uid)),
      switchMap(authUser => {
        if (authUser) {
          this.currentUser = authUser;
          this.email = authUser.email;
          this.userDocRef = doc(this.firestore, `users/${authUser.uid}`);
          // Ambil data dari Firestore
          console.log("EditProfileComponent: Fetching Firestore document...");
          return getDoc(this.userDocRef); // Mengembalikan Promise
        } else {
          // Tidak ada user, redirect ke login
          console.warn("EditProfileComponent: No authenticated user found, redirecting to login.");
          this.router.navigate(['/login']);
          return of(null); // Kembalikan observable null untuk menghentikan stream
        }
      }),
      catchError(error => {
        console.error("EditProfileComponent: Error getting user data:", error);
        this.errorMessage = "Gagal memuat data profil.";
        // Kembalikan null agar finalize tetap berjalan
        return of(null);
      }),
      // Finalize akan selalu berjalan baik stream sukses, error, atau complete
      finalize(() => {
        console.log("EditProfileComponent: Data fetch finalized. Setting loading FALSE.");
        this.isLoadingSubject.next(false); // Selesai loading
      })
    ).subscribe(docSnap => {
      // Proses snapshot HANYA jika tidak null (artinya tidak ada error sebelumnya)
      if (docSnap) {
        if (docSnap.exists()) {
          console.log("EditProfileComponent: Firestore document found.");
          const profileData = docSnap.data() as UserProfile;
          this.username = profileData.username;
          this.originalUsername = profileData.username;
          this.currentProfileImageUrl = profileData.profileImageUrl || null;
          this.profileImageUrl = profileData.profileImageUrl || this.defaultProfilePic; // Tambahkan baris ini
        } else if (this.currentUser) {
            // Dokumen tidak ada, tapi user Auth ada
            console.warn(`EditProfileComponent: Firestore document not found for user ${this.currentUser.uid}`);
             // Set default atau biarkan kosong, error message bisa ditambahkan jika perlu
            this.username = '';
            this.originalUsername = '';
            this.errorMessage = "Data profil tidak ditemukan.";
            this.profileImageUrl = this.defaultProfilePic; // Tambahkan baris ini
          }
      } else {
          // Handle kasus error atau user tidak ada dari switchMap/catchError
          console.log("EditProfileComponent: Skipping snapshot processing due to previous error or no user.");
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  // ... (fungsi onFileSelected, saveProfile, uploadImageToCloudinary, goBack, onProfileImageError, mapAuthCodeToMessage tetap sama seperti sebelumnya) ...

   // Fungsi untuk upload ke Cloudinary menggunakan Fetch API
   private async uploadImageToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryUploadPreset);

    try {
      const response = await fetch(this.cloudinaryUrl, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
       if (!data.secure_url) {
          throw new Error('Cloudinary response did not contain secure_url');
      }
      return data.secure_url;
    } catch (error) {
      console.error("Error during Cloudinary fetch:", error);
      throw error;
    }
  }

  // Fungsi kembali ke halaman profile
  goBack(): void {
    this.router.navigate(['/profile']);
  }

   // Fungsi fallback gambar profil
   onProfileImageError(event: Event): void {
    if (this.profileImageUrl !== this.defaultProfilePic) {
      this.profileImageUrl = this.defaultProfilePic;
    }
  }

   // Map error code (bisa digabung dengan yang di login/register)
   private mapAuthCodeToMessage(code: string): string {
    // Tambahkan case untuk error updatePassword jika perlu (misal: auth/requires-recent-login)
    switch (code) {
      case 'auth/requires-recent-login':
        return 'Untuk mengubah password, Anda perlu login kembali.';
      case 'auth/weak-password':
         return 'Password baru terlalu lemah (minimal 6 karakter).';
      // Tambahkan kode error lain yang relevan
      default:
        // Cek apakah ini pesan error umum
        if(code.startsWith('Gagal') || code.startsWith('Error')) return code;
        return 'Terjadi kesalahan yang tidak diketahui.';
    }
  }
   // Fungsi utama untuk menyimpan perubahan profil
   async saveProfile(): Promise<void> {
    if (!this.currentUser || !this.userDocRef || this.isSaving) {
      return; // Jangan proses jika tidak ada user, ref dokumen, atau sedang menyimpan
    }

    this.isSaving = true;
    this.errorMessage = null;
    let newImageUrl: string | null = this.currentProfileImageUrl; // Mulai dengan URL gambar saat ini
    let firestoreUpdates: Partial<UserProfile> = {}; // Objek untuk update Firestore
    let passwordUpdatePromise: Promise<void> | null = null; // Promise untuk update password

    // 1. Cek apakah gambar diubah dan upload jika perlu
    if (this.selectedFile) {
      try {
        console.log("Uploading new profile picture...");
        newImageUrl = await this.uploadImageToCloudinary(this.selectedFile);
        firestoreUpdates.profileImageUrl = newImageUrl; // Tandai untuk update Firestore
        console.log("New image URL:", newImageUrl);
      } catch (error) {
        this.errorMessage = `Gagal mengunggah gambar: ${error}`;
        this.isSaving = false;
        return; // Hentikan jika upload gagal
      }
    }

    // 2. Cek apakah username diubah
    if (this.username !== this.originalUsername) {
      firestoreUpdates.username = this.username;
      console.log("Username changed, will update Firestore.");
    }

    // 3. Cek apakah password baru diisi
    if (this.newPassword && this.newPassword.length >= 6) {
      console.log("Password change requested.");
      passwordUpdatePromise = updatePassword(this.currentUser, this.newPassword);
    } else if (this.newPassword && this.newPassword.length < 6) {
        this.errorMessage = "Password baru minimal 6 karakter.";
        this.isSaving = false;
        return; // Hentikan jika password baru tidak valid
    }

    // 4. Lakukan Update
    try {
      // Lakukan update Firestore jika ada perubahan
      if (Object.keys(firestoreUpdates).length > 0) {
        console.log("Updating Firestore with:", firestoreUpdates);
        await updateDoc(this.userDocRef, firestoreUpdates);
        console.log("Firestore updated successfully.");
        // Update data asli setelah sukses
        this.originalUsername = firestoreUpdates.username ?? this.originalUsername;
        this.currentProfileImageUrl = firestoreUpdates.profileImageUrl ?? this.currentProfileImageUrl;
      } else {
          console.log("No changes detected for Firestore.");
      }

      // Lakukan update password jika diminta
      if (passwordUpdatePromise) {
        console.log("Attempting to update password in Auth...");
        await passwordUpdatePromise;
        console.log("Password updated successfully in Auth.");
        this.newPassword = ''; // Kosongkan field password setelah sukses
      }

      // Jika sampai sini tanpa error, semua update berhasil
      console.log("Profile updated successfully!");
      this.router.navigate(['/profile']); // Kembali ke halaman profile

    } catch (error: any) {
      console.error("Error saving profile:", error);
      this.errorMessage = `Gagal menyimpan profil: ${this.mapAuthCodeToMessage(error.code || error.message)}`;
    } finally {
      this.isSaving = false;
    }
  }
  
  // Handler for file input change event
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // You can add your logic here to handle the selected file,
      // such as updating a preview or uploading the file.
      // Example: this.selectedFile = file;
    }
  }
}
