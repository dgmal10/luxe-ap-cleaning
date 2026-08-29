/**
 * Firestore data services — CRUD for all collections with localStorage fallback.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  setDoc,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type {
  Booking,
  ContactMessage,
  ScheduleConfig,
  GalleryItem,
} from '../types';

/* ============================================================
   DEMO LOCAL STORAGE HELPERS
   ============================================================ */

const todayStr = new Date().toISOString().split('T')[0];

const INITIAL_DEMO_BOOKINGS: Booking[] = [
  {
    id: 'demo-b1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+1 (774) 555-0192',
    address: '45 Elm Street, Apt 3B, Worcester, MA',
    service: 'Deep Cleaning',
    date: todayStr,
    time: '09:00 AM',
    notes: 'Please pay special attention to the master bathroom and oven.',
    status: 'confirmed',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 5 },
  },
  {
    id: 'demo-b2',
    name: 'Michael Chang',
    email: 'm.chang@example.com',
    phone: '+1 (508) 555-4819',
    address: '128 Highland St, Worcester, MA',
    service: 'Standard Cleaning',
    date: todayStr,
    time: '01:00 PM',
    notes: 'Key is under the front door mat. Friendly golden retriever inside.',
    status: 'pending',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 2 },
  },
  {
    id: 'demo-b3',
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    phone: '+1 (617) 555-8831',
    address: '12 Salisbury St, Worcester, MA',
    service: 'Move In / Move Out',
    date: todayStr,
    time: '03:00 PM',
    notes: 'Empty apartment, ready for handover.',
    status: 'pending',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 1 },
  },
];

const INITIAL_DEMO_MESSAGES: ContactMessage[] = [
  {
    id: 'demo-m1',
    name: 'David Miller',
    email: 'david.miller@gmail.com',
    message: 'Hello, do you provide weekly commercial cleaning for a small office (about 1,500 sq ft) in downtown Worcester?',
    read: false,
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 3 },
  },
  {
    id: 'demo-m2',
    name: 'Jessica Taylor',
    email: 'jtaylor@outlook.com',
    message: 'Hi! I booked a deep cleaning for next Friday. Can I add interior window cleaning to the service?',
    read: false,
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 7 },
  },
  {
    id: 'demo-m3',
    name: 'Carlos Mendes',
    email: 'carlos.m@yahoo.com',
    message: 'Great service last week! The house was spotless. Thank you so much to the team.',
    read: true,
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 * 24 },
  },
];

const INITIAL_DEMO_GALLERY: GalleryItem[] = [
  {
    id: 'demo-g1',
    src: '/img/hero-bg.png',
    storagePath: '',
    alt: 'Luxury living room deep cleaned and organized',
    category: 'Living Room',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 2 },
  },
  {
    id: 'demo-g2',
    src: '/img/gallery-kitchen.png',
    storagePath: '',
    alt: 'Modern kitchen counter and appliances gleaming',
    category: 'Kitchen',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 3 },
  },
  {
    id: 'demo-g3',
    src: '/img/gallery-bathroom.png',
    storagePath: '',
    alt: 'Luxury bathroom with spotless tiles and glass',
    category: 'Bathroom',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 4 },
  },
  {
    id: 'demo-g4',
    src: '/img/gallery-bedroom.png',
    storagePath: '',
    alt: 'Freshly made bedroom and pristine floors',
    category: 'Bedroom',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 * 5 },
  },
];

function getLocal<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

/* ============================================================
   BOOKINGS
   ============================================================ */

/** Create a booking (called from public form) */
export async function createBooking(data: Omit<Booking, 'id' | 'createdAt' | 'status'>): Promise<string> {
  if (!isFirebaseConfigured) {
    const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
    const newBooking: Booking = {
      ...data,
      id: `local-b-${Date.now()}`,
      status: 'pending',
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
    };
    setLocal('luxe_bookings', [newBooking, ...list]);
    return newBooking.id;
  }

  const ref = await addDoc(collection(db, 'bookings'), {
    ...data,
    status: 'pending',
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/** Get all bookings for a specific date (YYYY-MM-DD) */
export async function getBookingsByDate(date: string): Promise<Booking[]> {
  if (!isFirebaseConfigured) {
    const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
    return list.filter(b => b.date === date);
  }

  const q = query(
    collection(db, 'bookings'),
    where('date', '==', date),
    orderBy('time', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking);
}

/** Get all bookings */
export async function getAllBookings(): Promise<Booking[]> {
  if (!isFirebaseConfigured) {
    return getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
  }

  const q = query(
    collection(db, 'bookings'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking);
}

/** Subscribe to all bookings in real time */
export function subscribeToAllBookings(callback: (bookings: Booking[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    const fetchLocal = () => callback(getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS));
    fetchLocal();
    window.addEventListener('storage', fetchLocal);
    return () => window.removeEventListener('storage', fetchLocal);
  }

  const q = query(
    collection(db, 'bookings'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking);
    callback(list);
  }, (err) => {
    console.error('Real-time bookings subscription error:', err);
  });
}

/** Delete a booking */
export async function deleteBooking(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
    setLocal('luxe_bookings', list.filter(b => b.id !== id));
    return;
  }

  await deleteDoc(doc(db, 'bookings', id));
}

/** Update booking status */
export async function updateBookingStatus(
  id: string,
  status: Booking['status']
): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
    setLocal('luxe_bookings', list.map(b => b.id === id ? { ...b, status } : b));
    return;
  }

  await updateDoc(doc(db, 'bookings', id), { status });
}

/** Subscribe to all messages in real time */
export function subscribeToAllMessages(callback: (messages: ContactMessage[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    const fetchLocal = () => callback(getLocal<ContactMessage[]>('luxe_messages', INITIAL_DEMO_MESSAGES));
    fetchLocal();
    window.addEventListener('storage', fetchLocal);
    return () => window.removeEventListener('storage', fetchLocal);
  }

  const q = query(
    collection(db, 'messages'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContactMessage);
    callback(list);
  }, (err) => {
    console.error('Real-time messages subscription error:', err);
  });
}

/* ============================================================
   MESSAGES
   ============================================================ */

/** Create a message (called from public contact form) */
export async function createMessage(data: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>): Promise<string> {
  if (!isFirebaseConfigured) {
    const list = getLocal<ContactMessage[]>('luxe_messages', INITIAL_DEMO_MESSAGES);
    const newMsg: ContactMessage = {
      ...data,
      id: `local-m-${Date.now()}`,
      read: false,
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
    };
    setLocal('luxe_messages', [newMsg, ...list]);
    return newMsg.id;
  }

  const ref = await addDoc(collection(db, 'messages'), {
    ...data,
    read: false,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/** Get all messages, newest first */
export async function getMessages(): Promise<ContactMessage[]> {
  if (!isFirebaseConfigured) {
    return getLocal<ContactMessage[]>('luxe_messages', INITIAL_DEMO_MESSAGES);
  }

  const q = query(
    collection(db, 'messages'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContactMessage);
}

/** Mark a message as read */
export async function markMessageAsRead(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocal<ContactMessage[]>('luxe_messages', INITIAL_DEMO_MESSAGES);
    setLocal('luxe_messages', list.map(m => m.id === id ? { ...m, read: true } : m));
    return;
  }

  await updateDoc(doc(db, 'messages', id), { read: true });
}

/** Delete a message */
export async function deleteMessage(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocal<ContactMessage[]>('luxe_messages', INITIAL_DEMO_MESSAGES);
    setLocal('luxe_messages', list.filter(m => m.id !== id));
    return;
  }

  await deleteDoc(doc(db, 'messages', id));
}

/* ============================================================
   SCHEDULE CONFIG
   ============================================================ */

/** Get the schedule document reference (lazy to avoid crash without Firebase) */
function getScheduleDoc() {
  return doc(db, 'config', 'schedule');
}

/** Default schedule config */
const DEFAULT_SCHEDULE: ScheduleConfig = {
  workDays: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: false,
  },
  startTime: '08:00',
  endTime: '17:00',
  slotDuration: 60, // minutes
  blockedDates: [],
};

/** Get schedule configuration */
export async function getScheduleConfig(): Promise<ScheduleConfig> {
  if (!isFirebaseConfigured) {
    return getLocal<ScheduleConfig>('luxe_schedule', DEFAULT_SCHEDULE);
  }

  const snap = await getDoc(getScheduleDoc());
  if (!snap.exists()) {
    await setDoc(getScheduleDoc(), DEFAULT_SCHEDULE);
    return DEFAULT_SCHEDULE;
  }
  return snap.data() as ScheduleConfig;
}

/** Update schedule configuration */
export async function updateScheduleConfig(config: ScheduleConfig): Promise<void> {
  if (!isFirebaseConfigured) {
    setLocal('luxe_schedule', config);
    return;
  }

  await setDoc(getScheduleDoc(), config);
}

/* ============================================================
   GALLERY
   ============================================================ */

/** Add a gallery image */
export async function addGalleryImage(data: Omit<GalleryItem, 'id' | 'createdAt'>): Promise<string> {
  if (!isFirebaseConfigured) {
    const list = getLocal<GalleryItem[]>('luxe_gallery', INITIAL_DEMO_GALLERY);
    const newImg: GalleryItem = {
      ...data,
      id: `local-g-${Date.now()}`,
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
    };
    setLocal('luxe_gallery', [newImg, ...list]);
    return newImg.id;
  }

  const ref = await addDoc(collection(db, 'gallery'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/** Get all gallery images */
export async function getGalleryImages(): Promise<GalleryItem[]> {
  if (!isFirebaseConfigured) {
    return getLocal<GalleryItem[]>('luxe_gallery', INITIAL_DEMO_GALLERY);
  }

  const q = query(
    collection(db, 'gallery'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as GalleryItem);
}

/** Delete a gallery image */
export async function deleteGalleryImage(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocal<GalleryItem[]>('luxe_gallery', INITIAL_DEMO_GALLERY);
    setLocal('luxe_gallery', list.filter(g => g.id !== id));
    return;
  }

  await deleteDoc(doc(db, 'gallery', id));
}

/* ============================================================
   HELPERS
   ============================================================ */

/** Generate available time slots from schedule config */
export function generateTimeSlots(config: ScheduleConfig): string[] {
  const slots: string[] = [];
  const [startH, startM] = config.startTime.split(':').map(Number);
  const [endH, endM] = config.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m < endMinutes; m += config.slotDuration) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slots.push(`${displayH}:${min.toString().padStart(2, '0')} ${period}`);
  }

  return slots;
}
