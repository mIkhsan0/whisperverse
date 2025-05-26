import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core'; // Import HostListener
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Import Firestore related functions and types
// import { Firestore, collection, collectionData, query, orderBy, where, limit, QueryConstraint, startAt, endAt, CollectionReference, DocumentData } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, Subscription, combineLatest, of } from 'rxjs';
import { switchMap, debounceTime, distinctUntilChanged, map, tap, catchError } from 'rxjs/operators'; // Import tap

// Import interface Message
// import { Message } from '../../models/message.model'; // Sesuaikan path jika perlu

// Import Services dan Interface yang baru
import { NoteService, Note, PublicNotesResponse } from '../../services/note.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit, OnDestroy {
  private noteService: NoteService = inject(NoteService);
  // private musicService: MusicService = inject(MusicService); // Jika perlu fetch detail musik
  private router: Router = inject(Router);

  notes$: Observable<Note[]>; // Akan berisi data Note dari NoteService
  isLoading = false;
  errorMessage: string | null = null;

  // Untuk search (kita akan filter di client untuk sementara)
  searchTerm$ = new BehaviorSubject<string>('');
  private allNotes: Note[] = []; // Untuk menyimpan semua catatan dari halaman pertama (atau semua jika tidak ada paginasi)

  isScrolled = false;
  private scrollThreshold = 50;

  // Untuk paginasi (jika Anda ingin implementasi paginasi di Home)
  currentPage = 1;
  itemsPerPage = 10; // Sesuaikan dengan limit di backend
  lastVisibleCursor: string | null = null;
  hasMorePages = true;


  constructor() {
    // Mengambil semua catatan publik saat komponen dimuat
    // Kita akan gabungkan dengan searchTerm$ untuk filtering
    this.notes$ = this.searchTerm$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        // Jika ada searchTerm, kita filter dari allNotes yang sudah diambil
        if (term && this.allNotes.length > 0) {
          const lowerTerm = term.toLowerCase();
          const filteredNotes = this.allNotes.filter(note =>
            note.pesan.toLowerCase().includes(lowerTerm) ||
            (note.penerima && note.penerima.toLowerCase().includes(lowerTerm)) ||
            (note.pengirim && note.pengirim.toLowerCase().includes(lowerTerm))
            // Anda bisa tambahkan filter berdasarkan judul musik jika idMusic ada dan Anda fetch detailnya
          );
          return of(filteredNotes);
        }
        // Jika tidak ada searchTerm, atau allNotes kosong, kembalikan allNotes (yang di-fetch di bawah)
        // Atau, jika Anda ingin selalu fetch ulang dengan parameter search ke backend (memerlukan modifikasi backend)
        return of(this.allNotes); // Ini akan diupdate oleh fetchInitialPublicNotes
      })
    );
  }

  ngOnInit(): void {
    console.log('Home component initialized');
    this.fetchInitialPublicNotes();
  }

  fetchInitialPublicNotes(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.noteService.getAllPublicNotes(this.currentPage, this.itemsPerPage, this.lastVisibleCursor || undefined).pipe(
      tap(response => console.log('Response from getAllPublicNotes:', response)),
      catchError(err => {
        this.errorMessage = 'Gagal memuat catatan publik.';
        console.error('Error fetching public notes:', err);
        this.isLoading = false;
        this.hasMorePages = false;
        return of({ message: '', data: [], pagination: { currentPage: 1, limit: this.itemsPerPage, retrievedCount:0, nextPageCursor: null} } as PublicNotesResponse); // Kembalikan struktur default jika error
      })
    ).subscribe(response => {
      if (response && response.data) {
        // Jika ingin append untuk infinite scroll, atau ganti untuk paginasi biasa
        // Untuk filter client-side sederhana, kita simpan semua yang di-fetch dari halaman pertama
        this.allNotes = response.data;
        this.lastVisibleCursor = response.pagination.nextPageCursor;
        this.hasMorePages = !!response.pagination.nextPageCursor && response.data.length === this.itemsPerPage;
        this.searchTerm$.next(this.searchTerm$.value); // Trigger filter ulang dengan data baru
      }
      this.isLoading = false;
    });
  }

  // TODO: Implementasi loadMoreNotes() jika Anda ingin infinite scroll atau tombol "Load More"

  ngOnDestroy(): void {
    this.searchTerm$.complete(); // Atau unsubscribe jika ada subscription manual
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollPosition > this.scrollThreshold;
  }

  onSearchTermChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm$.next(inputElement.value);
  }

  navigateToDetail(noteId: string | undefined): void { // Menggunakan noteId sekarang
    if (noteId) {
      // Asumsi rute detail pesan/catatan Anda adalah '/message/:id' atau '/note/:id'
      // Kita menggunakan '/message/:id' berdasarkan app.routes.ts Anda
      this.router.navigate(['/message', noteId]);
    } else {
      console.error('HomeComponent: Cannot navigate to detail: noteId is undefined');
    }
  }

  onImageError(event: Event, note: Note): void { // Menggunakan Note sekarang
    const imgElement = event.target as HTMLImageElement;
    console.warn('Image failed to load:', imgElement?.src, 'for note to:', note.penerima);
    imgElement.style.display = 'none';
    const container = imgElement.parentElement;
    if (container) {
      const placeholder = container.querySelector('.image-placeholder');
      if (placeholder) {
        (placeholder as HTMLElement).style.display = 'flex';
      }
    }
  }
}

// export class HomeComponent implements OnInit, OnDestroy {
//   private firestore: Firestore = inject(Firestore);
//   private router: Router = inject(Router);

//   messages$: Observable<Message[]>;
//   private messagesCollection: CollectionReference<DocumentData>;

//   // Untuk search
//   searchTerm$ = new BehaviorSubject<string>('');
//   private searchSubscription: Subscription | null = null;

//   // --- State untuk efek scroll header ---
//   isScrolled = false;
//   // Tentukan batas scroll (dalam pixel) untuk mengubah header
//   private scrollThreshold = 50;
//   // ------------------------------------

//   constructor() {
//     this.messagesCollection = collection(this.firestore, 'messages');

//     this.messages$ = this.searchTerm$.pipe(
//       // tap(term => console.log("Search term changed:", term)), // Optional debug log
//       debounceTime(300),
//       distinctUntilChanged(),
//       switchMap(term => {
//         const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc'), limit(50)];
//         if (term) {
//           console.log(`Searching for recipient starting with: ${term}`);
//           constraints.splice(0, 1, orderBy('recipient'));
//           constraints.push(startAt(term));
//           constraints.push(endAt(term + '\uf8ff'));
//         } else {
//           // console.log('Fetching all recent messages'); // Optional debug log
//         }
//         const q = query(this.messagesCollection, ...constraints);
//         return collectionData(q, { idField: 'documentId' }) as Observable<Message[]>;
//       })
//       // Optional: Tambahkan catchError jika perlu
//     );
//   }

//   ngOnInit(): void {
//      console.log('Home component initialized');
//      // Tidak perlu subscribe manual jika pakai async pipe
//   }

//   ngOnDestroy(): void {
//     this.searchSubscription?.unsubscribe();
//   }

//   // --- Listener untuk scroll window ---
//   @HostListener('window:scroll', ['$event'])
//   onWindowScroll() {
//     const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
//     // Set isScrolled true jika posisi scroll melewati batas threshold
//     this.isScrolled = scrollPosition > this.scrollThreshold;
//     // console.log('Scroll Position:', scrollPosition, 'Is Scrolled:', this.isScrolled); // Optional debug log
//   }
//   // -----------------------------------

//   // Fungsi untuk update search term dari input
//   onSearchTermChange(event: Event): void {
//     const inputElement = event.target as HTMLInputElement;
//     this.searchTerm$.next(inputElement.value);
//   }

//   // Fungsi untuk navigasi ke detail
//   navigateToDetail(messageId: string | undefined): void {
//     if (messageId) {
//        console.log(`HomeComponent: Navigating to /message/${messageId}`);
//       this.router.navigate(['/message', messageId]);
//     } else {
//       console.error('HomeComponent: Cannot navigate to detail: messageId is undefined');
//     }
//   }

//   // Fungsi fallback gambar
//   onImageError(event: Event, message: Message): void {
//     const imgElement = event.target as HTMLImageElement;
//     console.warn('Image failed to load:', imgElement?.src, 'for message to:', message.recipient);
//     imgElement.style.display = 'none'; // Sembunyikan gambar jika error
    
//     const container = imgElement.parentElement;
//     if (container) {
//       const placeholder = container.querySelector('.image-placeholder');
//       if (placeholder) {
//         (placeholder as HTMLElement).style.display = 'flex'; // Tampilkan placeholder
//       }
//     }
//   }
// }
