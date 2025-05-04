import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, combineLatest, BehaviorSubject } from 'rxjs'; // Import combineLatest
import { switchMap, map, catchError, tap, shareReplay, filter, first } from 'rxjs/operators';

// Import Firebase services
import { Firestore, doc, getDoc, deleteDoc, DocumentReference, DocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { Auth, user, User } from '@angular/fire/auth';

// Import interface Message
import { Message } from '../../models/message.model'; // Sesuaikan path

@Component({
  selector: 'app-detail-message',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './detail-message.component.html',
  styleUrls: ['./detail-message.component.scss']
})
export class DetailMessageComponent implements OnInit {
  // Inject services
  private route: ActivatedRoute = inject(ActivatedRoute);
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);

  // Observable untuk ID pesan dari route
  private messageId$: Observable<string | null>;

  // Observable untuk data pesan dari Firestore
  message$: Observable<Message | null | undefined>; // undefined: loading, null: not found/error

  // Observable untuk status apakah user saat ini adalah pengirim
  isSender$: Observable<boolean>;

  // Observable untuk pesan error
  errorMessage$: Observable<string | null>;

  // Default image placeholder
  defaultProfilePic = 'assets/ic_person.svg'; // Ganti jika perlu

  isLoading$: Observable<boolean>; // Track loading state as Observable<boolean>
  private _isLoading = new BehaviorSubject<boolean>(false); // Internal loading state


  constructor() {
    console.log("DetailMessageComponent: Constructor - Initializing streams");

    // 1. Stream untuk mendapatkan messageId dari route
    this.messageId$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      tap(id => console.log("DetailMessageComponent: Message ID from route:", id)),
      shareReplay(1) // Penting agar paramMap tidak dipanggil ulang terus menerus
    );

    // 2. Stream untuk mendapatkan data pesan berdasarkan messageId$
    this.message$ = this.messageId$.pipe(
      switchMap(id => {
        if (!id) {
          console.log("DetailMessageComponent: No message ID found, returning null.");
          return of({ type: 'error', message: 'ID Pesan tidak ditemukan.' }); // Kembalikan objek error
        }
        console.log(`DetailMessageComponent: Fetching document for ID: ${id}`);
        const messageDocRef = doc(this.firestore, `messages/${id}`);
        return getDoc(messageDocRef).then(
            // Bungkus hasil Promise dalam objek agar bisa dibedakan
            snapshot => ({ type: 'data', snapshot }),
            error => ({ type: 'error', message: 'Gagal mengambil data dari Firestore.', error }) // Tangani error getDoc
        );
      }),
      map(result => {
        // Proses hasil dari switchMap
        if (result && result.type === 'data' && 'snapshot' in result) {
          const docSnap = result.snapshot as DocumentSnapshot<DocumentData>;
          if (docSnap.exists()) {
            console.log("DetailMessageComponent: Document found.");
            // Casting ke Message
            return { documentId: docSnap.id, ...docSnap.data() } as Message;
          } else {
            console.warn(`DetailMessageComponent: Document with ID ${docSnap.id} not found.`);
            // Set error message jika dokumen tidak ditemukan
            // (Kita bisa buat BehaviorSubject terpisah untuk error agar lebih rapi)
            return { type: 'error', message: 'Pesan tidak ditemukan.' }; // Kembalikan objek error
          }
        } else if (result && result.type === 'error') {
           console.error("DetailMessageComponent: Error occurred during fetch:", (result as any).error || (result as any).message);
           // Set error message dari objek error
           // (Gunakan BehaviorSubject untuk error message)
           return result; // Teruskan objek error
        }
        return null; // Kasus lain (seharusnya tidak terjadi)
      }),
       // Pisahkan penanganan error message dari data stream utama
      tap(dataOrError => {
          if (dataOrError && (dataOrError as any).type === 'error') {
              this._setErrorMessage((dataOrError as any).message);
          } else {
              this._setErrorMessage(null); // Hapus error jika data valid
          }
      }),
      // Filter keluar objek error, hanya teruskan data Message atau null
      map(dataOrError => (dataOrError && (dataOrError as any).type !== 'error') ? dataOrError as Message : null),
      shareReplay(1) // Cache hasil data pesan
    );
    // 3. Stream untuk status loading (berdasarkan _isLoading BehaviorSubject)
    this.isLoading$ = this._isLoading.asObservable();
  
    // 4. Stream untuk mengecek apakah user adalah pengirim
    this.isSender$ = combineLatest([user(this.auth), this.message$]).pipe(
      map(([currentUser, message]) => {
        const isSender = !!(currentUser && message && currentUser.uid === message.senderId);
        console.log(`DetailMessageComponent: Sender check - User: ${currentUser?.uid}, SenderID: ${message?.senderId}, Result: ${isSender}`);
        return isSender;
      }),
      catchError(() => of(false)), // Anggap false jika ada error
      shareReplay(1)
    );

     // 5. Stream untuk error message (gunakan BehaviorSubject internal)
     this.errorMessage$ = this._errorMessage.asObservable();
  }

  // BehaviorSubject internal untuk error message
  private _errorMessage = new BehaviorSubject<string | null>(null);
  private _setErrorMessage(msg: string | null): void {
      // Hanya update jika berbeda untuk menghindari infinite loop potensial
      if (this._errorMessage.value !== msg) {
          this._errorMessage.next(msg);
      }
  }


  ngOnInit(): void {
     console.log("DetailMessageComponent: ngOnInit - Component initialized, streams are active.");
     // Tidak perlu banyak logika di sini karena sudah reaktif
  }

  // Fungsi untuk menghapus pesan
  async deleteMessage(): Promise<void> {
    console.log("DetailMessageComponent: deleteMessage called");
    const messageId = await firstValueFrom(this.messageId$); // Dapatkan ID saat ini
    const isSender = await firstValueFrom(this.isSender$); // Dapatkan status sender saat ini

    if (!isSender || !messageId) {
      this._setErrorMessage('Anda tidak diizinkan menghapus pesan ini atau ID tidak valid.');
      return;
    }

    const confirmation = confirm('Apakah Anda yakin ingin menghapus pesan ini?');
    if (!confirmation) return;

    this._isLoading.next(true); // Tampilkan loading
    this._setErrorMessage(null);
    const messageDocRef = doc(this.firestore, `messages/${messageId}`);

    try {
      await deleteDoc(messageDocRef);
      console.log('DetailMessageComponent: Message deleted successfully:', messageId);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('DetailMessageComponent: Error deleting message:', error);
      this._setErrorMessage('Gagal menghapus pesan.');
      this._isLoading.next(false); // Sembunyikan loading jika gagal
    }
  }

  // Fungsi untuk kembali ke halaman Home
  goBack(): void {
    console.log("DetailMessageComponent: goBack called");
    this.router.navigate(['/home']);
  }

   // Fungsi fallback jika gambar gagal dimuat
   onImageError(event: Event): void {
    console.warn('DetailMessageComponent: Message image failed to load.');
    (event.target as HTMLImageElement).style.display = 'none';
   }
}

// Helper function
import { lastValueFrom } from 'rxjs';
function firstValueFrom<T>(source: Observable<T>): Promise<T> {
    // Pastikan observable tidak kosong sebelum memanggil lastValueFrom
    return lastValueFrom(source.pipe(first(value => value !== undefined))); // Ambil nilai non-undefined pertama
}
