import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, of, Subscription, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// // Import Firebase services
// import { Auth, user } from '@angular/fire/auth'; // user observable
// import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
// // Cloudinary tidak punya SDK Angular resmi yang mudah, kita bisa pakai Fetch API

// import { NavbarComponent } from '../../components/navbar/navbar.component';
// import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
// import { Subscription } from 'rxjs';
// import { first } from 'rxjs/operators'; // Untuk mengambil nilai user saat ini

// Import Services
import { AuthService, UserProfileFromFirestore } from '../../services/auth.service'; //
import { MusicService, Music } from '../../services/music.service'; //
import { NoteService, CreateNotePayload, CreateNoteResponse } from '../../services/note.service'; //
import { SongSelectionModalComponent } from '../../components/song-selection-modal/song-selection-modal.component';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, SongSelectionModalComponent],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})

export class CreateComponent implements OnInit, OnDestroy {
  private authService: AuthService = inject(AuthService);
  private musicService: MusicService = inject(MusicService);
  private noteService: NoteService = inject(NoteService);
  private router: Router = inject(Router);

  // Form data (sesuaikan dengan field untuk "Catatan/Note")
  pesan: string = ''; // Sebelumnya messageText
  penerima: string = ''; // Tetap
  pengirim: string | null = null; // Opsional, bisa diambil dari nama user login

  selectedFile: File | null = null;
  selectedFileName: string | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;

  // // Untuk pemilihan musik
  // availableMusic$: Observable<Music[]>;
  // selectedMusicId: string | null = null;
  // selectedMusicInfo: Music | null = null; // Untuk menampilkan info musik yang dipilih
  selectedMusicId: string | null = null;
  selectedMusicInfo: Music | null = null; // Ini akan diisi oleh modal

  isSongModalOpen = false; // State untuk mengontrol visibilitas modal


  // State variables
  isUploadingImage: boolean = false;
  isCreatingNote: boolean = false;
  errorMessage: string | null = null;
  currentUserProfile: UserProfileFromFirestore | null = null;
  private profileSubscription: Subscription | null = null;

  // Cloudinary config (tetap sama)
  readonly cloudinaryCloudName = 'ds7cudqcp';
  readonly cloudinaryUploadPreset = 'android_unsigned_upload';
  readonly cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`;

  constructor() {

  }

  ngOnInit(): void {
    this.profileSubscription = this.authService.currentUserProfile$.subscribe(profile => {
      this.currentUserProfile = profile;
      if (profile) {
        this.pengirim = profile.displayName || profile.username; // Isi pengirim default
      }
    });
  }

  ngOnDestroy(): void {
    this.profileSubscription?.unsubscribe();
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      this.selectedFileName = this.selectedFile.name;
      this.errorMessage = null;
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreviewUrl = reader.result;
      reader.readAsDataURL(this.selectedFile);
    } else {
      // ... reset file selection
    }
  }

  // // Dipanggil saat musik dipilih dari dropdown/modal
  // onMusicSelected(musicId: string | null): void {
  //   this.selectedMusicId = musicId;
  //   if (musicId) {
  //     // Anda bisa mengambil detail musik dari availableMusic$ jika sudah ada,
  //     // atau panggil getMusicById jika perlu info lebih lengkap yang tidak ada di list.
  //     // Untuk dropdown sederhana, ID sudah cukup.
  //     // Untuk menampilkan nama musik yang dipilih, Anda perlu mencarinya di daftar musik Anda.
  //     this.availableMusic$.subscribe(musicList => {
  //       this.selectedMusicInfo = musicList.find(music => music.id === musicId) || null;
  //     });
  //   } else {
  //     this.selectedMusicInfo = null;
  //   }
  // }

   // Metode yang dipanggil oleh (click) di HTML Anda
  openSongSelection(): void {
    console.log('CreateComponent: openSongSelection called');
    this.isSongModalOpen = true;
  }

  // Metode untuk menutup modal (bisa dipanggil dari modal atau dari overlay)
  closeSongSelectionModal(): void {
    this.isSongModalOpen = false;
  }

  // Metode untuk menangani lagu yang dipilih dari modal
  handleSongSelectedFromModal(selectedSong: Music): void {
    console.log('CreateComponent: Song selected from modal', selectedSong);
    if (selectedSong && selectedSong.id) {
      this.selectedMusicId = selectedSong.id;
      this.selectedMusicInfo = selectedSong;
    } else {
      this.selectedMusicId = null;
      this.selectedMusicInfo = null;
    }
    this.closeSongSelectionModal(); // Tutup modal setelah lagu dipilih
  }

  private async uploadImageToCloudinary(file: File): Promise<string | null> {
    if (!file) return null;
    this.isUploadingImage = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryUploadPreset);
    try {
      const response = await fetch(this.cloudinaryUrl, { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.secure_url || null;
    } finally {
      this.isUploadingImage = false;
    }
  }

  async createNote(): Promise<void> { // Menggantikan sendMessage
    if (!this.currentUserProfile || !this.currentUserProfile.userId) {
      this.errorMessage = "Tidak bisa membuat catatan: User tidak terautentikasi.";
      return;
    }
    if (this.isUploadingImage || this.isCreatingNote) return;

    this.errorMessage = null;
    this.isCreatingNote = true;
    let uploadedImageUrl: string | null = null;

    if (this.selectedFile) {
      try {
        uploadedImageUrl = await this.uploadImageToCloudinary(this.selectedFile);
      } catch (error: any) {
        this.errorMessage = `Gagal mengunggah gambar: ${error.message || error}`;
        this.isCreatingNote = false;
        return;
      }
    }

    const notePayload: CreateNotePayload = {
      pesan: this.pesan,
      penerima: this.penerima, // Pastikan ini sesuai dengan model backend Note Anda
      // pengirim: this.pengirim ?? undefined, // Backend akan mengambil dari req.user.name/email atau biarkan kosong
      gambar: uploadedImageUrl ?? undefined, // Akan undefined jika tidak ada gambar
      idMusic: this.selectedMusicId ?? undefined // ID musik yang dipilih
      // creatorUserId akan diisi oleh backend dari token
    };

    this.noteService.createNote(notePayload).subscribe({
      next: (response: CreateNoteResponse) => {
        console.log('Catatan berhasil dibuat:', response);
        this.resetForm();
        this.router.navigate(['/success']); // Atau ke halaman detail catatan yang baru dibuat
      },
      error: (error: any) => {
        console.error('Error membuat catatan:', error);
        this.errorMessage = error.error?.message || error.error?.errors?.[0]?.msg || 'Gagal membuat catatan.';
        this.isCreatingNote = false;
      },
      complete: () => {
        this.isCreatingNote = false;
      }
    });
  }

  private resetForm(): void {
    this.pesan = '';
    this.penerima = '';
    // this.pengirim tidak perlu direset jika diambil dari profil
    this.selectedFile = null;
    this.selectedFileName = null;
    this.imagePreviewUrl = null;
    this.selectedMusicId = null;
    this.selectedMusicInfo = null;
    this.errorMessage = null;
    this.isSongModalOpen = false;
  }

  // Logika untuk UI pemilihan musik bisa Anda kembangkan di sini atau di HTML
  openSongSelectionModal(): void {
      // Implementasi untuk membuka modal pemilihan lagu
      // Untuk dropdown sederhana, Anda bisa bind selectedMusicId ke ngModel di <select>
      console.log("Tombol pilih lagu diklik, tampilkan dropdown/modal di HTML");
  }
}

// export class CreateComponent implements OnDestroy {
//   // Inject services
//   private auth: Auth = inject(Auth);
//   private firestore: Firestore = inject(Firestore);
//   private router: Router = inject(Router);

//   // Form data
//   recipient: string = '';
//   messageText: string = '';
//   selectedFile: File | null = null;
//   selectedFileName: string | null = null;
//   imagePreviewUrl: string | ArrayBuffer | null = null;
//   selectedSongName: string | null = null;
//   selectedSongUrl: string | null = null; // URL lagu dari Firebase Storage atau API lain
//   // Jika Anda punya daftar lagu yang tetap:
//   // availableSongs: { name: string, url: string, artist?: string }[] = [
//   //   { name: 'Lagu Gembira', url: 'path/to/lagu1.mp3', artist: 'Penyanyi A' },
//   //   { name: 'Melodi Sedih', url: 'path/to/lagu2.mp3', artist: 'Penyanyi B' }
//   // ];

//   // State variables
//   isUploading: boolean = false;
//   isSending: boolean = false;
//   errorMessage: string | null = null;
//   userId: string | null = null; // Untuk menyimpan ID user yang login

//   private userSubscription: Subscription;

//   // --- Konfigurasi Cloudinary (PENTING!) ---
//   // Ganti dengan nama cloud Anda
//   readonly cloudinaryCloudName = 'ds7cudqcp';
//   // Ganti dengan nama upload preset (unsigned) yang Anda buat di Cloudinary
//   readonly cloudinaryUploadPreset = 'android_unsigned_upload';
//   readonly cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`;
//   // -----------------------------------------

//   constructor() {
//     // Ambil user ID saat ini
//     this.userSubscription = user(this.auth).pipe(first()).subscribe(currentUser => {
//       if (currentUser) {
//         this.userId = currentUser.uid;
//       } else {
//         console.error("User not logged in!");
//         // Idealnya, user tidak bisa sampai sini karena ada AuthGuard
//         this.router.navigate(['/login']);
//       }
//     });
//   }

//   ngOnDestroy(): void {
//     this.userSubscription?.unsubscribe();
//   }

//   // Dipanggil saat user memilih file
//   onFileSelected(event: Event): void {
//     const element = event.currentTarget as HTMLInputElement;
//     let fileList: FileList | null = element.files;

//     if (fileList && fileList.length > 0) {
//       this.selectedFile = fileList[0];
//       this.selectedFileName = this.selectedFile.name;
//       this.errorMessage = null; // Reset error

//       // Buat preview gambar (opsional)
//       const reader = new FileReader();
//       reader.onload = (e) => this.imagePreviewUrl = reader.result;
//       reader.readAsDataURL(this.selectedFile);

//     } else {
//       this.selectedFile = null;
//       this.selectedFileName = null;
//       this.imagePreviewUrl = null;
//     }
//   }

//   // Fungsi utama untuk mengirim pesan
//   async sendMessage(): Promise<void> {
//     if (!this.userId) {
//       this.errorMessage = "Tidak bisa mengirim pesan: User tidak terautentikasi.";
//       return;
//     }
//     if (this.isUploading || this.isSending) return; // Jangan proses jika sedang berjalan

//     this.errorMessage = null;
//     let uploadedImageUrl: string | null = null;

//     // 1. Upload gambar jika ada
//     if (this.selectedFile) {
//       this.isUploading = true;
//       try {
//         uploadedImageUrl = await this.uploadImageToCloudinary(this.selectedFile);
//         console.log('Image uploaded successfully:', uploadedImageUrl);
        
//         const messagesCollectionRef = collection(this.firestore, 'messages');
//         const messageData = {
//           recipient: this.recipient,
//           snippet: this.messageText,
//           senderId: this.userId,
//           timestamp: serverTimestamp(),
//           imageUrl: uploadedImageUrl, // Tetap ada
//           songName: this.selectedSongName, // Tambahkan nama lagu
//           songUrl: this.selectedSongUrl     // Tambahkan URL lagu
//         };
        
//         const docRef = await addDoc(messagesCollectionRef, messageData);
//         console.log('Message sent successfully with ID:', docRef.id);

//         this.resetForm();
//         this.router.navigate(['/success']);
        
//       } catch (error) {
//         console.error('Cloudinary upload failed:', error);
//         this.errorMessage = `Gagal mengunggah gambar: ${error}`;
//         this.isUploading = false;
//         console.error('Error sending message to Firestore:', error);
//         this.errorMessage = `Gagal mengirim pesan: ${error}`;
//         return; // Hentikan proses jika upload gagal
//       } finally {
//         this.isUploading = false;
//       }
      
//     }
    

//     // 2. Simpan data pesan ke Firestore
//     this.isSending = true;
//     try {
//       const messagesCollectionRef = collection(this.firestore, 'messages');
//       const messageData = {
//         recipient: this.recipient,
//         snippet: this.messageText,
//         senderId: this.userId,
//         timestamp: serverTimestamp(), // Gunakan timestamp server Firestore
//         imageUrl: uploadedImageUrl // Akan null jika tidak ada gambar
//       };

//       const docRef = await addDoc(messagesCollectionRef, messageData);
//       console.log('Message sent successfully with ID:', docRef.id);

//       // 3. Reset form dan navigasi ke halaman sukses
//       this.resetForm();
//       this.router.navigate(['/success']);

//     } catch (error) {
//       console.error('Error sending message to Firestore:', error);
//       this.errorMessage = `Gagal mengirim pesan: ${error}`;
//     } finally {
//       this.isSending = false;
//     }
//   }

//   // Fungsi untuk upload ke Cloudinary menggunakan Fetch API
//   private async uploadImageToCloudinary(file: File): Promise<string> {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('upload_preset', this.cloudinaryUploadPreset);
//     // Tambahkan parameter lain jika perlu (misal: tags, context)
//     // formData.append('tags', 'angular-upload');

//     try {
//       const response = await fetch(this.cloudinaryUrl, {
//         method: 'POST',
//         body: formData
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();
//       if (!data.secure_url) {
//           throw new Error('Cloudinary response did not contain secure_url');
//       }
//       return data.secure_url; // Kembalikan URL gambar yang aman

//     } catch (error) {
//       console.error("Error during Cloudinary fetch:", error);
//       throw error; // Lempar ulang error agar bisa ditangkap di sendMessage
//     }
//   }


//   openSongSelection(): void {
//     // Logika untuk membuka modal/dialog pemilihan lagu
//     // Ini bisa menggunakan library modal pihak ketiga atau custom component
//     console.log('Membuka dialog pemilihan lagu...');
//     // Contoh sederhana: menggunakan prompt (tidak disarankan untuk UI sebenarnya)
//     // const songChoice = prompt("Pilih lagu:\n1. Lagu Gembira\n2. Melodi Sedih");
//     // if (songChoice === "1" && this.availableSongs[0]) {
//     //   this.selectSong(this.availableSongs[0]);
//     // } else if (songChoice === "2" && this.availableSongs[1]) {
//     //   this.selectSong(this.availableSongs[1]);
//     // }
//   }
//    // Fungsi ini akan dipanggil dari dialog pemilihan lagu
//   selectSong(song: { name: string, url: string, artist?: string }): void {
//     this.selectedSongName = song.artist ? `${song.name} - ${song.artist}` : song.name;
//     this.selectedSongUrl = song.url;
//     console.log('Lagu dipilih:', this.selectedSongName, this.selectedSongUrl);
//   }



//   // Fungsi untuk mereset form setelah sukses
//   private resetForm(): void {
//     this.recipient = '';
//     this.messageText = '';
//     this.selectedFile = null;
//     this.selectedFileName = null;
//     this.imagePreviewUrl = null;
//     this.selectedSongName = null; // Reset lagu yang dipilih
//     this.selectedSongUrl = null;   // Reset URL lagu
//     this.errorMessage = null;
//     // Reset file input value (agak tricky, cara paling mudah adalah me-reset formnya,
//     // tapi karena kita pakai ngModel, cukup set properti file ke null)
//     // Jika input tidak reset, bisa gunakan ViewChild untuk akses elemen inputnya
//   }
// }
