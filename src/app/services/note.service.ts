import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export interface Note {
  id?: string; // noteId dari Firestore
  noteId?: string; // Bisa juga menggunakan ini jika konsisten dari backend
  pesan: string;
  penerima?: string | null;
  pengirim?: string | null;
  gambar?: string | null; // URL gambar
  idMusic?: string | null;
  creatorUserId: string;
  createdAt: any; // Firestore Timestamp (bisa jadi objek atau string ISO)
  updatedAt: any; // Firestore Timestamp
}

export interface CreateNotePayload { // Data yang dikirim untuk membuat note
  pesan: string;
  penerima?: string;
  pengirim?: string;
  gambar?: string;
  idMusic?: string;
}

export interface UpdateNotePayload { // Data yang dikirim untuk update note (semua opsional)
  pesan?: string;
  penerima?: string;
  pengirim?: string;
  gambar?: string | null; // Bisa null untuk menghapus
  idMusic?: string | null; // Bisa null untuk menghapus
}

// Interface untuk Respons API
export interface CreateNoteResponse {
  message: string;
  data: Note;
}

export interface UserNotesResponse {
  message: string;
  data: Note[];
}

export interface PublicNotesResponse {
  message: string;
  data: Note[];
  pagination: {
    currentPage: number;
    limit: number;
    retrievedCount: number;
    nextPageCursor: string | null;
  };
}

export interface SingleNoteResponse {
  message: string;
  data: Note;
}

export interface UpdateNoteResponse {
  message: string;
  data: Note;
}

export interface DeleteNoteResponse {
  message: string;
  noteId: string;
}

@Injectable({
  providedIn: 'root'
})

export class NoteService {
  private baseUrl = 'http://localhost:3000/api/notes';

  constructor(private http: HttpClient, private authService: AuthService) { }

  // POST /api/notes - Membuat catatan baru
  createNote(noteData: CreateNotePayload): Observable<CreateNoteResponse> {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      return throwError(() => new Error('Tidak terautentikasi untuk membuat catatan.'));
    }
    return this.http.post<CreateNoteResponse>(`${this.baseUrl}/`, noteData, { headers });
  }

  // GET /api/notes - Mendapatkan semua catatan milik pengguna yang login
  getUserNotes(): Observable<UserNotesResponse> {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      return throwError(() => new Error('Tidak terautentikasi untuk mengambil catatan pengguna.'));
    }
    return this.http.get<UserNotesResponse>(`${this.baseUrl}/`, { headers });
  }

  // GET /api/notes/public - Mendapatkan semua catatan untuk tampilan publik
  getAllPublicNotes(page?: number, limit?: number, lastVisible?: string): Observable<PublicNotesResponse> {
    let params = new HttpParams();
    if (page) {
      params = params.set('page', page.toString());
    }
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    if (lastVisible) {
      params = params.set('lastVisible', lastVisible);
    }
    return this.http.get<PublicNotesResponse>(`${this.baseUrl}/public`, { params });
  }

  // GET /api/notes/:noteId - Mendapatkan detail satu catatan
  getNoteById(noteId: string): Observable<SingleNoteResponse> {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      // Pertimbangkan apakah endpoint ini benar-benar memerlukan auth di semua kasus,
      // atau jika ada kondisi di mana note publik bisa diakses tanpa auth jika ID diketahui.
      // Berdasarkan routes Anda, ini memerlukan verifyFirebaseToken.
      return throwError(() => new Error('Tidak terautentikasi untuk mengambil detail catatan.'));
    }
    return this.http.get<SingleNoteResponse>(`${this.baseUrl}/${noteId}`, { headers });
  }

  // PUT /api/notes/:noteId - Memperbarui catatan
  updateNote(noteId: string, noteData: UpdateNotePayload): Observable<UpdateNoteResponse> {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      return throwError(() => new Error('Tidak terautentikasi untuk memperbarui catatan.'));
    }
    return this.http.put<UpdateNoteResponse>(`${this.baseUrl}/${noteId}`, noteData, { headers });
  }

  // DELETE /api/notes/:noteId - Menghapus catatan
  deleteNote(noteId: string): Observable<DeleteNoteResponse> {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      return throwError(() => new Error('Tidak terautentikasi untuk menghapus catatan.'));
    }
    return this.http.delete<DeleteNoteResponse>(`${this.baseUrl}/${noteId}`, { headers });
  }
}
