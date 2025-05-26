import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError} from 'rxjs';
import { AuthService } from './auth.service'; // Make sure the path is correct

export interface Music {
  id?: string; // Document ID dari Firestore
  title: string;
  artist: string;
  album?: string; // Tetap opsional jika tidak selalu ada
  genre?: string; // Tetap opsional
  musicUrl: string; // Dari Cloudinary
  musicPublicId?: string; // ID publik Cloudinary untuk musik
  imageUrl: string; // Dari Cloudinary untuk cover
  coverPublicId?: string; // ID publik Cloudinary untuk cover
  duration?: number; // Durasi dalam detik
  createdAt: any; // Bisa jadi string (ISO date) atau Firestore Timestamp
  userId: string;
  username: string; // Username pengunggah
  updatedAt?: any; // Opsional jika ada
}

export interface AddMusicResponse {
  id: string;
  message: string;
}

export interface UpdateMusicResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})

export class MusicService {
  private baseUrl = 'http://localhost:3000/api/music';

  constructor(private http: HttpClient, private authService: AuthService) { }

  // --- METODE UNTUK MUSIC API ---

  // POST /api/music/ (addMusic)
  // Membutuhkan FormData karena ada file upload
  // Dilindungi oleh verifyFirebaseToken
  addMusic(musicData: FormData): Observable<AddMusicResponse> {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      console.error('ApiService: Pengguna tidak terautentikasi');
      return throwError(() => new Error('Pengguna tidak terautentikasi'));
    }
    
    return this.http.post<AddMusicResponse>(`${this.baseUrl}/`, musicData, { headers });
  }

  // GET /api/music/ (getAllMusic)
  // Publik (tidak ada verifyFirebaseToken di rute backend)
  getAllMusic(): Observable<Music[]> {
    return this.http.get<Music[]>(`${this.baseUrl}/`);
  }

  // GET /api/music/user (getMusicByUser)
  // Dilindungi oleh verifyFirebaseToken
  getMusicByUser(): Observable<Music[]> {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      console.error('ApiService: Pengguna tidak terautentikasi');
      return throwError(() => new Error('Pengguna tidak terautentikasi'));
    }
    
    return this.http.get<Music[]>(`${this.baseUrl}/user`, { headers });
  }

  // GET /api/music/:id (getMusicById)
  // Publik
  getMusicById(id: string): Observable<Music> {
    return this.http.get<Music>(`${this.baseUrl}/${id}`);
  }

  // PUT /api/music/:id (updateMusic)
  // Membutuhkan FormData karena ada file upload
  // Dilindungi oleh verifyFirebaseToken
  updateMusic(id: string, musicData: FormData): Observable<UpdateMusicResponse> {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      console.error('ApiService: Pengguna tidak terautentikasi');
      return throwError(() => new Error('Pengguna tidak terautentikasi'));
    }
    
    return this.http.put<UpdateMusicResponse>(`${this.baseUrl}/${id}`, musicData, { headers });
  }

  // DELETE /api/music/:id (deleteMusic)
  // Dilindungi oleh verifyFirebaseToken
  deleteMusic(id: string): Observable<any> { // Biasanya mengembalikan status atau pesan sukses
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      console.error('ApiService: Pengguna tidak terautentikasi');
      return throwError(() => new Error('Pengguna tidak terautentikasi'));
    }
    
    return this.http.delete<any>(`${this.baseUrl}/${id}`, { headers });
  }
}
