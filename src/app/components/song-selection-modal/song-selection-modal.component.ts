// src/app/components/song-selection-modal/song-selection-modal.component.ts
import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Untuk fitur pencarian nanti
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { MusicService, Music } from '../../services/music.service'; // Sesuaikan path

@Component({
  selector: 'app-song-selection-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './song-selection-modal.component.html',
  styleUrls: ['./song-selection-modal.component.scss']
})
export class SongSelectionModalComponent implements OnInit {
  private musicService: MusicService = inject(MusicService);

  @Output() songSelected = new EventEmitter<Music>();
  @Output() closeModalEvent = new EventEmitter<void>(); // Nama event diubah agar lebih jelas

  availableMusic$: Observable<Music[]>;
  isLoading = false;
  errorMessage: string | null = null;

  searchTerm: string = ''; // Untuk fitur pencarian
  filteredMusic: Music[] = [];
  allMusic: Music[] = []; // Untuk menyimpan semua musik agar filter tidak query ulang

  constructor() {
    this.availableMusic$ = this.musicService.getAllMusic().pipe(
      tap(musicList => {
        this.allMusic = musicList;
        this.filteredMusic = musicList; // Inisialisasi filteredMusic
        console.log('SongSelectionModal: Music list loaded', musicList);
      }),
      catchError(err => {
        this.errorMessage = 'Gagal memuat daftar musik.';
        console.error('SongSelectionModal: Error loading music:', err);
        this.isLoading = false;
        return of([]);
      })
    );
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.availableMusic$.subscribe(() => {
      this.isLoading = false;
    });
  }

  selectSong(song: Music): void {
    this.songSelected.emit(song);
    // Modal akan ditutup oleh CreateComponent setelah event ini diterima
  }

  closeModal(): void {
    this.closeModalEvent.emit();
  }

  filterMusic(): void {
    if (!this.searchTerm.trim()) {
      this.filteredMusic = this.allMusic;
      return;
    }
    const lowerSearchTerm = this.searchTerm.toLowerCase();
    this.filteredMusic = this.allMusic.filter(
      song =>
        song.title.toLowerCase().includes(lowerSearchTerm) ||
        song.artist.toLowerCase().includes(lowerSearchTerm) ||
        (song.album && song.album.toLowerCase().includes(lowerSearchTerm))
    );
  }
}