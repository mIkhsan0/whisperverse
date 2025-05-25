import { Timestamp } from '@angular/fire/firestore'; // Import Timestamp

export interface Message {
  documentId?: string; // ID dokumen Firestore (opsional di sini, akan kita dapatkan)
  recipient: string;
  snippet: string;
  imageUrl?: string | null; // Bisa string URL atau null
  senderId: string;
  timestamp: Timestamp; // Gunakan tipe Timestamp dari Firestore
  songName?: string | null; // Properti baru untuk nama lagu
  songUrl?: string | null;  // Properti baru untuk URL lagu
  songAlbumArtUrl?: string;
}
