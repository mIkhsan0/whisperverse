import { Component, inject, OnInit, ViewChild, ElementRef, ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, combineLatest, BehaviorSubject } from 'rxjs'; // Import combineLatest
import { switchMap, map, catchError, tap, shareReplay, filter, first } from 'rxjs/operators';

// // Import Firebase services
// import { Firestore, doc, getDoc, deleteDoc, DocumentReference, DocumentSnapshot, DocumentData } from '@angular/fire/firestore';
// import { Auth, user, User } from '@angular/fire/auth';

// // Import interface Message
// import { Message } from '../../models/message.model'; // Sesuaikan path

// Import NoteService dan interface Note
import { NoteService, Note, SingleNoteResponse } from '../../services/note.service'; // Sesuaikan path
import { AuthService } from '../../services/auth.service';

// Pipe untuk format waktu
@Pipe({
  name: 'formatTime',
  standalone: true // Jika menggunakan Angular 14+
})
  
export class FormatTimePipe implements PipeTransform {
  transform(value: number): string {
    if (isNaN(value) || value === Infinity || value == null) {
      return '0:00';
    }
    const minutes: number = Math.floor(value / 60);
    const seconds: number = Math.floor(value % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
}

@Component({
  selector: 'app-detail-message',
  standalone: true,
  imports: [CommonModule, FormatTimePipe],
  templateUrl: './detail-message.component.html',
  styleUrls: ['./detail-message.component.scss']
})

export class DetailMessageComponent implements OnInit {
  // Inject services
  private route: ActivatedRoute = inject(ActivatedRoute);
  // private firestore: Firestore = inject(Firestore);
  // private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private noteService: NoteService = inject(NoteService); // Inject NoteService
  private authService: AuthService = inject(AuthService); // Inject AuthService

  // // Observable untuk ID pesan dari route
  // private messageId$: Observable<string | null>;
  

  // // Observable untuk data pesan dari Firestore
  // message$: Observable<Message | null | undefined>; // undefined: loading, null: not found/error

  // // Observable untuk status apakah user saat ini adalah pengirim
  // isSender$: Observable<boolean>;

  // // Observable untuk pesan error
  // errorMessage$: Observable<string | null>;

  // // Default image placeholder
  // defaultProfilePic = 'assets/ic_person.svg'; // Ganti jika perlu

  // isLoading$: Observable<boolean>; // Track loading state as Observable<boolean>
  // private _isLoading = new BehaviorSubject<boolean>(false); // Internal loading state

  private noteId$: Observable<string | null>;
  note$: Observable<Note | null | undefined>; // Ganti Message menjadi Note
  isSender$: Observable<boolean>;
  errorMessage$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null); // Buat BehaviorSubject
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false); // Buat BehaviorSubject

  defaultProfilePic = 'assets/ic_person.svg';

  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;
  audioPlayer!: HTMLAudioElement;

  isPlaying = false;
  duration = 0;
  currentTime = 0;
  audioProgress = 0;

  constructor(private cdr: ChangeDetectorRef) {
    console.log("DetailMessageComponent: Constructor - Initializing streams");

    // // 1. Stream untuk mendapatkan messageId dari route
    // this.messageId$ = this.route.paramMap.pipe(
    //   map(params => params.get('id')),
    //   tap(id => console.log("DetailMessageComponent: Message ID from route:", id)),
    //   shareReplay(1) // Penting agar paramMap tidak dipanggil ulang terus menerus
    // );

    // // 2. Stream untuk mendapatkan data pesan berdasarkan messageId$
    // this.message$ = this.messageId$.pipe(
    //   switchMap(id => {
    //     if (!id) {
    //       console.log("DetailMessageComponent: No message ID found, returning null.");
    //       return of({ type: 'error', message: 'ID Pesan tidak ditemukan.' }); // Kembalikan objek error
    //     }
    //     console.log(`DetailMessageComponent: Fetching document for ID: ${id}`);
    //     const messageDocRef = doc(this.firestore, `messages/${id}`);
    //     return getDoc(messageDocRef).then(
    //         // Bungkus hasil Promise dalam objek agar bisa dibedakan
    //         snapshot => ({ type: 'data', snapshot }),
    //         error => ({ type: 'error', message: 'Gagal mengambil data dari Firestore.', error }) // Tangani error getDoc
    //     );
    //   }),
    //   map(result => {
    //     // Proses hasil dari switchMap
    //     if (result && result.type === 'data' && 'snapshot' in result) {
    //       const docSnap = result.snapshot as DocumentSnapshot<DocumentData>;
    //       if (docSnap.exists()) {
    //         console.log("DetailMessageComponent: Document found.");
    //         // Casting ke Message
    //         return { documentId: docSnap.id, ...docSnap.data() } as Message;
    //       } else {
    //         console.warn(`DetailMessageComponent: Document with ID ${docSnap.id} not found.`);
    //         // Set error message jika dokumen tidak ditemukan
    //         // (Kita bisa buat BehaviorSubject terpisah untuk error agar lebih rapi)
    //         return { type: 'error', message: 'Pesan tidak ditemukan.' }; // Kembalikan objek error
    //       }
    //     } else if (result && result.type === 'error') {
    //        console.error("DetailMessageComponent: Error occurred during fetch:", (result as any).error || (result as any).message);
    //        // Set error message dari objek error
    //        // (Gunakan BehaviorSubject untuk error message)
    //        return result; // Teruskan objek error
    //     }
    //     return null; // Kasus lain (seharusnya tidak terjadi)
    //   }),
    //    // Pisahkan penanganan error message dari data stream utama
    //   tap(dataOrError => {
    //       if (dataOrError && (dataOrError as any).type === 'error') {
    //           this._setErrorMessage((dataOrError as any).message);
    //       } else {
    //           this._setErrorMessage(null); // Hapus error jika data valid
    //       }
    //   }),
    //   // Filter keluar objek error, hanya teruskan data Message atau null
    //   map(dataOrError => (dataOrError && (dataOrError as any).type !== 'error') ? dataOrError as Message : null),
    //   shareReplay(1) // Cache hasil data pesan
    // );
    // // 3. Stream untuk status loading (berdasarkan _isLoading BehaviorSubject)
    // this.isLoading$ = this._isLoading.asObservable();
  
    // // 4. Stream untuk mengecek apakah user adalah pengirim
    // this.isSender$ = combineLatest([user(this.auth), this.message$]).pipe(
    //   map(([currentUser, message]) => {
    //     const isSender = !!(currentUser && message && currentUser.uid === message.senderId);
    //     console.log(`DetailMessageComponent: Sender check - User: ${currentUser?.uid}, SenderID: ${message?.senderId}, Result: ${isSender}`);
    //     return isSender;
    //   }),
    //   catchError(() => of(false)), // Anggap false jika ada error
    //   shareReplay(1)
    // );

    //  // 5. Stream untuk error message (gunakan BehaviorSubject internal)
    //  this.errorMessage$ = this._errorMessage.asObservable();

    this.noteId$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      tap(id => console.log("DetailMessageComponent: Note ID from route:", id)),
      shareReplay(1)
    );

    this.note$ = this.noteId$.pipe(
      tap(() => this.isLoading$.next(true)), // Mulai loading
      switchMap(id => {
        if (!id) {
          this.errorMessage$.next('ID Catatan tidak ditemukan.');
          this.isLoading$.next(false);
          return of(null); // Kembalikan null jika tidak ada ID
        }
        // Panggil NoteService
        return this.noteService.getNoteById(id).pipe(
          map((response: SingleNoteResponse) => {
            if (response && response.data) {
              const note = response.data;
              console.log("DetailMessageComponent: Note data fetched via NoteService:", response.data);
              this.errorMessage$.next(null); // Hapus error jika sukses
              if (note.songDuration != null && isFinite(note.songDuration) && note.songDuration > 0) {
                this.duration = note.songDuration;
                console.log('Initial duration set from note.songDuration:', this.duration);
              } else {
                this.duration = 0; // Default jika tidak ada atau tidak valid
                console.log('note.songDuration not valid or not present, initial duration set to 0. songDuration was:', note.songDuration);
              }
              this.cdr.detectChanges();
              return response.data;
            }
            this.errorMessage$.next('Catatan tidak ditemukan atau format respons tidak sesuai.');
            return null;
          }),
          catchError(err => {
            console.error('DetailMessageComponent: Error fetching note via NoteService:', err);
            this.errorMessage$.next(err.error?.message || 'Gagal mengambil detail catatan.');
            return of(null); // Kembalikan null jika error
          }),
          tap(() => this.isLoading$.next(false)) // Selesai loading
        );
      }),
      shareReplay(1),
      tap(() => this.setupAudioPlayerAfterNoteLoad())
    );

    this.isSender$ = this.authService.currentUserProfile$.pipe( // Gunakan currentUserProfile$ dari AuthService
      switchMap(currentUserProfile => {
        return this.note$.pipe(
          map(note => {
            if (currentUserProfile && note && note.creatorUserId) {
              return currentUserProfile.userId === note.creatorUserId;
            }
            return false;
          })
        );
      }),
      catchError(() => of(false)),
      shareReplay(1)
    );
  }

  // Method untuk menginisialisasi audio player
  ngAfterViewInit(): void {
    // Pastikan audioPlayerRef sudah terdefinisi setelah view init
    if (this.audioPlayerRef) {
        this.audioPlayer = this.audioPlayerRef.nativeElement;
    }
  }

  // Panggil ini setelah message$ stream mendapatkan data lagu
  // Misalnya di dalam subscribe message$ atau setelah *ngIf memastikan elemen ada
  setupAudioPlayer(): void {
    if (this.audioPlayerRef) {
      this.audioPlayer = this.audioPlayerRef.nativeElement;
    } else {
      // Coba lagi setelah beberapa saat jika ViewChild belum siap
      setTimeout(() => {
        if (this.audioPlayerRef) {
            this.audioPlayer = this.audioPlayerRef.nativeElement;
        }
      }, 100);
    }
  }

  // Pastikan audioPlayer siap sebelum event listener dipasang
  setupAudioPlayerAfterNoteLoad(): void {
    // Beri sedikit waktu agar ViewChild ter-resolve setelah *ngIf (jika audio tag ada di dalam *ngIf note)
    setTimeout(() => {
      if (this.audioPlayerRef && this.audioPlayerRef.nativeElement) {
        this.audioPlayer = this.audioPlayerRef.nativeElement;
        console.log('Audio player setup successfully after note load.');
        // Anda bisa langsung assign event listener di sini jika perlu,
        // tapi @HostListener atau (event)="handler()" di template biasanya sudah cukup.
      } else {
        console.warn('Audio player ref not available after note load attempt.');
      }
    }, 0);
  }

  onAudioLoadedMetadata(event: Event): void {
    if (this.audioPlayer) { // Pastikan audioPlayer sudah diinisialisasi
        this.duration = this.audioPlayer.duration;
        this.cdr.detectChanges(); // Update view jika perlu
    }
  }

  onAudioTimeUpdate(event: Event): void {
     if (this.audioPlayer) {
        this.currentTime = this.audioPlayer.currentTime;
        this.audioProgress = (this.currentTime / this.duration) * 100;
        this.cdr.detectChanges(); // Update view jika perlu
     }
  }

  onAudioEnded(): void {
    this.isPlaying = false;
    this.audioProgress = 0; // atau 100, tergantung preferensi
    this.currentTime = 0; // Reset currentTime saat lagu selesai
    this.cdr.detectChanges();
  }

  togglePlayPause(): void {
    if (!this.audioPlayer) {
      this.setupAudioPlayer(); // Coba setup jika belum
      if(!this.audioPlayer) return; // Jika masih belum ada, keluar
    }

    if (this.audioPlayer.paused) {
      this.audioPlayer.play();
      this.isPlaying = true;
    } else {
      this.audioPlayer.pause();
      this.isPlaying = false;
    }
    this.cdr.detectChanges();
  }

  seekAudio(event: MouseEvent): void {
    if (!this.audioPlayer || !this.duration) return;
    const progressBarContainer = event.currentTarget as HTMLElement;
    const clickPosition = event.offsetX;
    const barWidth = progressBarContainer.offsetWidth;
    const seekTime = (clickPosition / barWidth) * this.duration;
    this.audioPlayer.currentTime = seekTime;
    this.cdr.detectChanges();
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

  // // Fungsi untuk menghapus pesan
  // async deleteMessage(): Promise<void> {
  //   console.log("DetailMessageComponent: deleteMessage called");
  //   const messageId = await firstValueFrom(this.messageId$); // Dapatkan ID saat ini
  //   const isSender = await firstValueFrom(this.isSender$); // Dapatkan status sender saat ini

  //   if (!isSender || !messageId) {
  //     this._setErrorMessage('Anda tidak diizinkan menghapus pesan ini atau ID tidak valid.');
  //     return;
  //   }

  //   const confirmation = confirm('Apakah Anda yakin ingin menghapus pesan ini?');
  //   if (!confirmation) return;

  //   this._isLoading.next(true); // Tampilkan loading
  //   this._setErrorMessage(null);
  //   const messageDocRef = doc(this.firestore, `messages/${messageId}`);

  //   try {
  //     await deleteDoc(messageDocRef);
  //     console.log('DetailMessageComponent: Message deleted successfully:', messageId);
  //     this.router.navigate(['/home']);
  //   } catch (error) {
  //     console.error('DetailMessageComponent: Error deleting message:', error);
  //     this._setErrorMessage('Gagal menghapus pesan.');
  //     this._isLoading.next(false); // Sembunyikan loading jika gagal
  //   }
  // }

  async deleteMessage(): Promise<void> { // Sebaiknya ganti nama jadi deleteNote
    const currentNoteId = await firstValueFrom(this.noteId$);
    const senderStatus = await firstValueFrom(this.isSender$);

    if (!senderStatus || !currentNoteId) {
      this.errorMessage$.next('Anda tidak diizinkan menghapus catatan ini atau ID tidak valid.');
      return;
    }

    const confirmation = confirm('Apakah Anda yakin ingin menghapus catatan ini?');
    if (!confirmation) return;

    this.isLoading$.next(true);
    this.errorMessage$.next(null);

    this.noteService.deleteNote(currentNoteId).subscribe({
      next: (response) => {
        console.log('DetailMessageComponent: Catatan berhasil dihapus via NoteService', response);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('DetailMessageComponent: Error menghapus catatan via NoteService:', err);
        this.errorMessage$.next(err.error?.message || 'Gagal menghapus catatan.');
        this.isLoading$.next(false);
      },
      complete: () => {
        this.isLoading$.next(false);
      }
    });
  }

  // Fungsi untuk kembali ke halaman Home
  goBack(): void {
    console.log("DetailMessageComponent: goBack called");
    this.router.navigate(['/home']);
  }

  //  // Fungsi fallback jika gambar gagal dimuat
  //  onImageError(event: Event): void {
  //   console.warn('DetailMessageComponent: Message image failed to load.');
  //   (event.target as HTMLImageElement).style.display = 'none';
  // }

  // Fungsi fallback jika gambar gagal dimuat
  onImageError(event: Event): void {
    console.warn('DetailMessageComponent: Message image failed to load.');
    (event.target as HTMLImageElement).style.display = 'none'; // Atau ganti dengan placeholder
  }


  // formatMessageText(snippet: string): string {
  //   // Contoh sederhana:
  //   // Anda perlu logika yang lebih canggih untuk mencocokkan pola dari desain Anda.
  //   // Ini hanya ilustrasi.
  //   let formattedText = snippet;
  //   // Misalnya, jika Anda ingin "MAKAN JELLY RASA tomat" selalu merah
  //   const targetPhrase = "MAKAN JELLY RASA tomat";
  //   if (snippet.includes(targetPhrase)) {
  //     formattedText = snippet.replace(targetPhrase, `<span style="color: red;">${targetPhrase}</span>`);
  //   }
  //   // Tambahkan logika lain untuk warna berbeda jika perlu
  //   return formattedText;
  // }
  formatMessageText(snippet: string): string {
    // Logika format teks Anda (jika masih relevan)
    return snippet;
  }
}

// // Helper function
// import { lastValueFrom } from 'rxjs';
// function firstValueFrom<T>(source: Observable<T>): Promise<T> {
//     // Pastikan observable tidak kosong sebelum memanggil lastValueFrom
//     return lastValueFrom(source.pipe(first(value => value !== undefined))); // Ambil nilai non-undefined pertama
// }

// Helper function (bisa dipindah ke utils jika sering dipakai)
import { lastValueFrom } from 'rxjs';
function firstValueFrom<T>(source: Observable<T>): Promise<T> {
    return lastValueFrom(source.pipe(first(value => value !== undefined && value !== null)));
}