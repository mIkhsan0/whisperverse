import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core'; // Import HostListener
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Import Firestore related functions and types
import { Firestore, collection, collectionData, query, orderBy, where, limit, QueryConstraint, startAt, endAt, CollectionReference, DocumentData } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, Subscription, combineLatest } from 'rxjs';
import { switchMap, debounceTime, distinctUntilChanged, map, tap } from 'rxjs/operators'; // Import tap

// Import interface Message
import { Message } from '../../models/message.model'; // Sesuaikan path jika perlu

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private router: Router = inject(Router);

  messages$: Observable<Message[]>;
  private messagesCollection: CollectionReference<DocumentData>;

  // Untuk search
  searchTerm$ = new BehaviorSubject<string>('');
  private searchSubscription: Subscription | null = null;

  // --- State untuk efek scroll header ---
  isScrolled = false;
  // Tentukan batas scroll (dalam pixel) untuk mengubah header
  private scrollThreshold = 50;
  // ------------------------------------

  constructor() {
    this.messagesCollection = collection(this.firestore, 'messages');

    this.messages$ = this.searchTerm$.pipe(
      // tap(term => console.log("Search term changed:", term)), // Optional debug log
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc'), limit(50)];
        if (term) {
          console.log(`Searching for recipient starting with: ${term}`);
          constraints.splice(0, 1, orderBy('recipient'));
          constraints.push(startAt(term));
          constraints.push(endAt(term + '\uf8ff'));
        } else {
          // console.log('Fetching all recent messages'); // Optional debug log
        }
        const q = query(this.messagesCollection, ...constraints);
        return collectionData(q, { idField: 'documentId' }) as Observable<Message[]>;
      })
      // Optional: Tambahkan catchError jika perlu
    );
  }

  ngOnInit(): void {
     console.log('Home component initialized');
     // Tidak perlu subscribe manual jika pakai async pipe
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  // --- Listener untuk scroll window ---
  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    // Set isScrolled true jika posisi scroll melewati batas threshold
    this.isScrolled = scrollPosition > this.scrollThreshold;
    // console.log('Scroll Position:', scrollPosition, 'Is Scrolled:', this.isScrolled); // Optional debug log
  }
  // -----------------------------------

  // Fungsi untuk update search term dari input
  onSearchTermChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm$.next(inputElement.value);
  }

  // Fungsi untuk navigasi ke detail
  navigateToDetail(messageId: string | undefined): void {
    if (messageId) {
       console.log(`HomeComponent: Navigating to /message/${messageId}`);
      this.router.navigate(['/message', messageId]);
    } else {
      console.error('HomeComponent: Cannot navigate to detail: messageId is undefined');
    }
  }

  // Fungsi fallback gambar
  onImageError(event: Event): void {
    console.warn('Image failed to load:', (event.target as HTMLImageElement)?.src);
    // (event.target as HTMLImageElement).src = 'assets/placeholder-image.png';
     (event.target as HTMLImageElement).style.display = 'none'; // Sembunyikan jika error
      // Atau tampilkan placeholder div
     const placeholder = (event.target as HTMLImageElement).nextElementSibling;
     if (placeholder && placeholder.classList.contains('image-placeholder')) {
       (placeholder as HTMLElement).style.display = 'flex';
     }
  }
}
