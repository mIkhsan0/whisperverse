export interface UserProfile {
    uid?: string; // Opsional, bisa kita tambahkan jika perlu
    username: string;
    email: string; // Meskipun email ada di Auth, seringkali disimpan juga di Firestore
    profileImageUrl?: string | null; // URL gambar dari Cloudinary
    // Tambahkan field lain jika ada (misal: createdAt)
  }
  