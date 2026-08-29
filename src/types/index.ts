/** Service data type */
export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

/** Gallery image type (public display) */
export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
}

/** Booking form data */
export interface BookingFormData {
  service: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

/** Contact form data */
export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

/** Navigation item */
export interface NavItem {
  label: string;
  href: string;
}

/* ============================================================
   ADMIN TYPES
   ============================================================ */

/** Booking stored in Firestore */
export interface Booking {
  id: string;
  service: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: unknown; // Firestore Timestamp
}

/** Contact message stored in Firestore */
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: unknown; // Firestore Timestamp
}

/** Schedule configuration */
export interface ScheduleConfig {
  workDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  startTime: string;   // e.g. "08:00"
  endTime: string;     // e.g. "17:00"
  slotDuration: number; // in minutes
  blockedDates: string[]; // YYYY-MM-DD
}

/** Gallery item stored in Firestore */
export interface GalleryItem {
  id: string;
  src: string;          // public URL from Firebase Storage
  storagePath: string;  // internal path for deletion
  alt: string;
  category: string;
  createdAt: unknown;   // Firestore Timestamp
}

/** Admin sidebar nav item */
export interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
}
