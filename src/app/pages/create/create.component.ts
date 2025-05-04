import { Component, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Import Firebase services
import { Auth, user } from '@angular/fire/auth'; // user observable
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
// Cloudinary tidak punya SDK Angular resmi yang mudah, kita bisa pakai Fetch API

import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators'; // Untuk mengambil nilai user saat ini

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent implements OnDestroy {
  // Inject services
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private router: Router = inject(Router);

  // Form data
  recipient: string = '';
  messageText: string = '';
  selectedFile: File | null = null;
  selectedFileName: string | null = null;
  imagePreviewUrl: string | ArrayBuffer | null = null;

  // State variables
  isUploading: boolean = false;
  isSending: boolean = false;
  errorMessage: string | null = null;
  userId: string | null = null; // Untuk menyimpan ID user yang login

  private userSubscription: Subscription;

  // --- Konfigurasi Cloudinary (PENTING!) ---
  // Ganti dengan nama cloud Anda
  readonly cloudinaryCloudName = 'ds7cudqcp';
  // Ganti dengan nama upload preset (unsigned) yang Anda buat di Cloudinary
  readonly cloudinaryUploadPreset = 'android_unsigned_upload';
  readonly cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`;
  // -----------------------------------------

  constructor() {
    // Ambil user ID saat ini
    this.userSubscription = user(this.auth).pipe(first()).subscribe(currentUser => {
      if (currentUser) {
        this.userId = currentUser.uid;
      } else {
        console.error("User not logged in!");
        // Idealnya, user tidak bisa sampai sini karena ada AuthGuard
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  // Dipanggil saat user memilih file
  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      this.selectedFileName = this.selectedFile.name;
      this.errorMessage = null; // Reset error

      // Buat preview gambar (opsional)
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreviewUrl = reader.result;
      reader.readAsDataURL(this.selectedFile);

    } else {
      this.selectedFile = null;
      this.selectedFileName = null;
      this.imagePreviewUrl = null;
    }
  }

  // Fungsi utama untuk mengirim pesan
  async sendMessage(): Promise<void> {
    if (!this.userId) {
      this.errorMessage = "Tidak bisa mengirim pesan: User tidak terautentikasi.";
      return;
    }
    if (this.isUploading || this.isSending) return; // Jangan proses jika sedang berjalan

    this.errorMessage = null;
    let uploadedImageUrl: string | null = null;

    // 1. Upload gambar jika ada
    if (this.selectedFile) {
      this.isUploading = true;
      try {
        uploadedImageUrl = await this.uploadImageToCloudinary(this.selectedFile);
        console.log('Image uploaded successfully:', uploadedImageUrl);
      } catch (error) {
        console.error('Cloudinary upload failed:', error);
        this.errorMessage = `Gagal mengunggah gambar: ${error}`;
        this.isUploading = false;
        return; // Hentikan proses jika upload gagal
      } finally {
        this.isUploading = false;
      }
    }

    // 2. Simpan data pesan ke Firestore
    this.isSending = true;
    try {
      const messagesCollectionRef = collection(this.firestore, 'messages');
      const messageData = {
        recipient: this.recipient,
        snippet: this.messageText,
        senderId: this.userId,
        timestamp: serverTimestamp(), // Gunakan timestamp server Firestore
        imageUrl: uploadedImageUrl // Akan null jika tidak ada gambar
      };

      const docRef = await addDoc(messagesCollectionRef, messageData);
      console.log('Message sent successfully with ID:', docRef.id);

      // 3. Reset form dan navigasi ke halaman sukses
      this.resetForm();
      this.router.navigate(['/success']);

    } catch (error) {
      console.error('Error sending message to Firestore:', error);
      this.errorMessage = `Gagal mengirim pesan: ${error}`;
    } finally {
      this.isSending = false;
    }
  }

  // Fungsi untuk upload ke Cloudinary menggunakan Fetch API
  private async uploadImageToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryUploadPreset);
    // Tambahkan parameter lain jika perlu (misal: tags, context)
    // formData.append('tags', 'angular-upload');

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
      return data.secure_url; // Kembalikan URL gambar yang aman

    } catch (error) {
      console.error("Error during Cloudinary fetch:", error);
      throw error; // Lempar ulang error agar bisa ditangkap di sendMessage
    }
  }

  // Fungsi untuk mereset form setelah sukses
  private resetForm(): void {
    this.recipient = '';
    this.messageText = '';
    this.selectedFile = null;
    this.selectedFileName = null;
    this.imagePreviewUrl = null;
    this.errorMessage = null;
    // Reset file input value (agak tricky, cara paling mudah adalah me-reset formnya,
    // tapi karena kita pakai ngModel, cukup set properti file ke null)
    // Jika input tidak reset, bisa gunakan ViewChild untuk akses elemen inputnya
  }
}
