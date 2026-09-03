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
import { db, isFirebaseConfigured, ensureAnonymousAuth } from './firebase';
import type {
  Booking,
  ContactMessage,
  ScheduleConfig,
  PricingConfig,
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
   DATE & TIME NORMALIZATION UTILITIES
   ============================================================ */

/**
 * Normalizes any date string to canonical "YYYY-MM-DD" format.
 */
export function normalizeDate(date: string): string {
  if (!date) return '';
  const trimmed = date.trim();
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const y = parts[0].padStart(4, '0');
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (trimmed.includes('/')) {
    const slashParts = trimmed.split('/');
    if (slashParts.length === 3) {
      if (slashParts[0].length === 4) {
        return `${slashParts[0]}-${slashParts[1].padStart(2, '0')}-${slashParts[2].padStart(2, '0')}`;
      }
    }
  }
  return trimmed;
}

/**
 * Safely parse a "YYYY-MM-DD" date string into a local Date at 12:00:00 PM without any UTC timezone shift.
 */
export function parseLocalDate(dateStr: string): Date {
  const clean = normalizeDate(dateStr);
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }
  return new Date();
}

/**
 * Returns the 0-indexed day of the week (0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday) without timezone shifts.
 */
export function getDayOfWeekFromDate(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

/**
 * Returns today's date in local time as "YYYY-MM-DD"
 */
export function getLocalTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns tomorrow's date in local time as "YYYY-MM-DD"
 */
export function getLocalTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalize any time string to canonical format e.g. "8:00 AM", "10:00 AM", "1:00 PM"
 * Handles "09:00 AM", "9:00AM", "09:00", "13:00", "1:00 PM", "01:00 PM", "13:00:00", etc.
 */
export function normalizeTimeSlot(time: string): string {
  if (!time) return '';
  const cleaned = time.trim().replace(/\s+/g, ' ').toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
  if (!match) return cleaned;

  let h = parseInt(match[1], 10);
  const m = match[2];
  let period = match[3]?.toUpperCase();

  if (!period) {
    period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
  } else {
    h = h % 12 || 12;
  }

  return `${h}:${m} ${period}`;
}

/**
 * Returns a deterministic document ID for a booked time slot e.g. "2026-09-04___10_00_AM"
 */
export function getSlotDocId(date: string, time: string): string {
  const cleanD = normalizeDate(date);
  const cleanT = normalizeTimeSlot(time).replace(/[^a-zA-Z0-9]/g, '_');
  return `${cleanD}___${cleanT}`;
}

/**
 * Generates a cryptographically strong secret token required for customer self-service confirmation
 */
export function generateClientToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'sec_' + crypto.randomUUID().replace(/-/g, '');
  }
  return 'sec_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/* ============================================================
   BOOKINGS
   ============================================================ */

/** Create a booking with atomic double-booking check and schedule availability check */
export async function createBooking(data: Omit<Booking, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const cleanDate = normalizeDate(data.date);
  const cleanTime = normalizeTimeSlot(data.time);

  if (!cleanDate || !cleanTime) {
    throw new Error('Date and time are required to book.');
  }

  // Validate working day of the week and blocked dates
  const schedConfig = await getScheduleConfig();
  if (schedConfig) {
    if (schedConfig.blockedDates?.includes(cleanDate)) {
      throw new Error('This date is blocked and unavailable for reservations.');
    }
    const dayKeys: (keyof ScheduleConfig['workDays'])[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayIndex = getDayOfWeekFromDate(cleanDate);
    const dayKey = dayKeys[dayIndex];
    if (schedConfig.workDays && schedConfig.workDays[dayKey] === false) {
      throw new Error('We are closed on this day of the week. Please choose an open day.');
    }
  }

  const clientToken = generateClientToken();

  if (isFirebaseConfigured) {
    try {
      await ensureAnonymousAuth();
    } catch {
      // ignore
    }

    const slotDocId = getSlotDocId(cleanDate, cleanTime);

    // Atomic double-booking check: verify if this specific slot is already reserved
    try {
      const slotSnap = await getDoc(doc(db, 'booked_slots', slotDocId));
      if (slotSnap.exists()) {
        const slotData = slotSnap.data();
        if (slotData && slotData.status !== 'cancelled') {
          throw new Error('This time slot was just reserved by another customer. Please choose a different time.');
        }
      }
    } catch (checkErr: any) {
      if (checkErr.message && checkErr.message.includes('just reserved')) {
        throw checkErr;
      }
    }

    try {
      const ref = await addDoc(collection(db, 'bookings'), {
        ...data,
        date: cleanDate,
        time: cleanTime,
        status: 'pending',
        clientToken,
        createdAt: Timestamp.now(),
      });

      // Mark the slot as reserved in the public booked_slots collection
      try {
        await setDoc(doc(db, 'booked_slots', slotDocId), {
          date: cleanDate,
          time: cleanTime,
          bookingId: ref.id,
          status: 'booked',
          createdAt: Timestamp.now(),
        });
      } catch (slotErr) {
        console.warn('Error setting booked_slots doc:', slotErr);
      }

      return ref.id;
    } catch (err) {
      console.warn('Firestore addDoc fallback:', err);
    }
  }

  const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
  const fallbackId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newBooking: Booking = {
    ...data,
    date: cleanDate,
    time: cleanTime,
    id: fallbackId,
    status: 'pending',
    clientToken,
    createdAt: { seconds: Math.floor(Date.now() / 1000) },
  };
  setLocal('luxe_bookings', [newBooking, ...list]);
  return fallbackId;
}

/** Get all active bookings for a specific date (YYYY-MM-DD) */
export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const cleanDate = normalizeDate(date);
  if (!cleanDate) return [];

  if (isFirebaseConfigured) {
    try {
      await ensureAnonymousAuth();
      const q = query(collection(db, 'booked_slots'), where('date', '==', cleanDate));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => d.data())
        .filter(d => d.status !== 'cancelled')
        .map(d => ({
          id: (d.bookingId || d.id) as string,
          date: d.date as string,
          time: d.time as string,
          status: d.status as Booking['status'],
        } as Booking));
    } catch (err) {
      console.warn('Error fetching booked_slots by date from Firestore:', err);
    }
  }

  const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
  return list.filter(b => normalizeDate(b.date) === cleanDate && b.status !== 'cancelled');
}

/** Subscribe to active booked time slots for a specific date in real time */
export function subscribeToBookingsByDate(
  date: string,
  callback: (bookedSlots: string[]) => void
): Unsubscribe {
  const cleanDate = normalizeDate(date);
  if (!cleanDate) {
    callback([]);
    return () => {};
  }

  if (!isFirebaseConfigured) {
    const check = () => {
      const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
      const taken = list
        .filter(b => normalizeDate(b.date) === cleanDate && b.status !== 'cancelled')
        .map(b => normalizeTimeSlot(b.time));
      callback(taken);
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }

  // Real-time listener for booked slots on this date from public booked_slots collection
  const q = query(collection(db, 'booked_slots'), where('date', '==', cleanDate));
  return onSnapshot(
    q,
    (snap) => {
      const taken = snap.docs
        .map(d => d.data())
        .filter(d => d.status !== 'cancelled')
        .map(d => normalizeTimeSlot(d.time as string));
      callback(taken);
    },
    (err) => {
      console.warn('Real-time booked_slots error:', err);
      getBookingsByDate(cleanDate).then(list => {
        callback(list.map(b => normalizeTimeSlot(b.time)));
      }).catch(() => {});
    }
  );
}

function getTimestampMillis(ts: unknown, fallbackDate?: string): number {
  if (ts && typeof ts === 'object') {
    if ('seconds' in ts && typeof (ts as { seconds: number }).seconds === 'number') {
      return (ts as { seconds: number }).seconds * 1000;
    }
    if ('toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
      return (ts as { toMillis: () => number }).toMillis();
    }
  }
  if (fallbackDate) {
    try {
      const parsed = new Date(`${fallbackDate}T12:00:00`).getTime();
      if (!isNaN(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return 0;
}

/** Get all bookings */
export async function getAllBookings(): Promise<Booking[]> {
  if (!isFirebaseConfigured) {
    return getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
  }

  try {
    const snap = await getDocs(collection(db, 'bookings'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking);
    list.sort((a, b) => getTimestampMillis(b.createdAt, b.date) - getTimestampMillis(a.createdAt, a.date));
    return list;
  } catch (err) {
    console.error('Error fetching all bookings:', err);
    return [];
  }
}

/** Subscribe to all bookings in real time */
export function subscribeToAllBookings(
  callback: (bookings: Booking[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (!isFirebaseConfigured) {
    const fetchLocal = () => callback(getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS));
    fetchLocal();
    window.addEventListener('storage', fetchLocal);
    return () => window.removeEventListener('storage', fetchLocal);
  }

  const q = collection(db, 'bookings');
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking);
      list.sort((a, b) => getTimestampMillis(b.createdAt, b.date) - getTimestampMillis(a.createdAt, a.date));
      callback(list);
    },
    (err) => {
      console.error('Real-time bookings subscription error:', err);
      if (onError) onError(err);
      // Fallback one-time fetch
      getAllBookings().then(callback).catch(() => {});
    }
  );
}

/** Get a single booking by ID */
export async function getBookingById(id: string): Promise<Booking | null> {
  const cleanId = id.trim();
  if (!cleanId) return null;

  if (!isFirebaseConfigured) {
    const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
    return list.find(b => b.id.toLowerCase() === cleanId.toLowerCase()) || null;
  }

  try {
    const snap = await getDoc(doc(db, 'bookings', cleanId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Booking;
    }
  } catch (err) {
    console.warn('Direct getDoc failed, trying collection query fallback:', err);
  }

  try {
    const snap = await getDocs(collection(db, 'bookings'));
    const found = snap.docs.find(
      d => d.id.toLowerCase() === cleanId.toLowerCase() || d.id.toLowerCase().startsWith(cleanId.toLowerCase())
    );
    if (found) {
      return { id: found.id, ...found.data() } as Booking;
    }
  } catch (err) {
    console.error('Fallback query error in getBookingById:', err);
  }

  return null;
}

/** Delete a booking */
export async function deleteBooking(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
    setLocal('luxe_bookings', list.filter(b => b.id !== id));
    return;
  }

  await deleteDoc(doc(db, 'bookings', id));

  // Remove corresponding slot from booked_slots
  try {
    const q = query(collection(db, 'booked_slots'), where('bookingId', '==', id));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (err) {
    console.warn('Error removing booked_slots on deleteBooking:', err);
  }
}

/** Update booking status (verifies clientToken if provided) */
export async function updateBookingStatus(
  id: string,
  status: Booking['status'],
  clientToken?: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
    setLocal('luxe_bookings', list.map(b => b.id === id ? { ...b, status } : b));
    return;
  }

  const payload: Record<string, any> = { status };
  if (clientToken) {
    payload.clientToken = clientToken;
  }

  await updateDoc(doc(db, 'bookings', id), payload);

  // Sync slot status with booked_slots
  try {
    const q = query(collection(db, 'booked_slots'), where('bookingId', '==', id));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      if (status === 'cancelled') {
        await updateDoc(d.ref, { status: 'cancelled' });
      } else {
        await updateDoc(d.ref, { status: 'booked' });
      }
    }
  } catch (err) {
    console.warn('Error updating booked_slots status:', err);
  }
}

/** Update custom / final booking quote price */
export async function updateBookingPrice(
  id: string,
  finalPrice: number
): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocal<Booking[]>('luxe_bookings', INITIAL_DEMO_BOOKINGS);
    setLocal('luxe_bookings', list.map(b => b.id === id ? { ...b, finalPrice } : b));
    return;
  }

  await updateDoc(doc(db, 'bookings', id), { finalPrice });
}

/** Sync all existing bookings into booked_slots (locks all legacy/existing bookings) */
export async function syncBookedSlotsFromBookings(bookings: Booking[]): Promise<void> {
  if (!isFirebaseConfigured || !bookings || bookings.length === 0) return;
  try {
    for (const b of bookings) {
      if (b.date && b.time && b.id) {
        const slotDocId = getSlotDocId(b.date, b.time);
        await setDoc(
          doc(db, 'booked_slots', slotDocId),
          {
            date: normalizeDate(b.date),
            time: normalizeTimeSlot(b.time),
            bookingId: b.id,
            status: b.status === 'cancelled' ? 'cancelled' : 'booked',
          },
          { merge: true }
        );

        // Ensure legacy booking has a secret clientToken
        if (!b.clientToken) {
          const tok = generateClientToken();
          await updateDoc(doc(db, 'bookings', b.id), { clientToken: tok }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('Sync booked_slots error:', err);
  }
}

/** Subscribe to all messages in real time */
export function subscribeToAllMessages(callback: (messages: ContactMessage[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    const fetchLocal = () => callback(getLocal<ContactMessage[]>('luxe_messages', INITIAL_DEMO_MESSAGES));
    fetchLocal();
    window.addEventListener('storage', fetchLocal);
    return () => window.removeEventListener('storage', fetchLocal);
  }

  const q = collection(db, 'messages');
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContactMessage);
      list.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      callback(list);
    },
    (err) => {
      console.error('Real-time messages subscription error:', err);
      getMessages().then(callback).catch(() => {});
    }
  );
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
  customSlots: [
    '8:00 AM',
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
  ],
};

/** Get schedule configuration */
export async function getScheduleConfig(): Promise<ScheduleConfig> {
  if (!isFirebaseConfigured) {
    return getLocal<ScheduleConfig>('luxe_schedule', DEFAULT_SCHEDULE);
  }

  try {
    const snap = await getDoc(getScheduleDoc());
    if (!snap.exists()) {
      await setDoc(getScheduleDoc(), DEFAULT_SCHEDULE);
      setLocal('luxe_schedule', DEFAULT_SCHEDULE);
      return DEFAULT_SCHEDULE;
    }
    const data = snap.data() as ScheduleConfig;
    const merged: ScheduleConfig = {
      ...DEFAULT_SCHEDULE,
      ...data,
      workDays: {
        ...DEFAULT_SCHEDULE.workDays,
        ...(data.workDays || {}),
      },
      customSlots: data.customSlots || DEFAULT_SCHEDULE.customSlots,
      blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
    };
    setLocal('luxe_schedule', merged);
    return merged;
  } catch (err) {
    console.error('Error fetching schedule config from Firestore:', err);
    return getLocal<ScheduleConfig>('luxe_schedule', DEFAULT_SCHEDULE);
  }
}

/** Update schedule configuration */
export async function updateScheduleConfig(config: ScheduleConfig): Promise<void> {
  // Always persist to localStorage for instant local availability and sync
  setLocal('luxe_schedule', config);

  if (!isFirebaseConfigured) {
    return;
  }

  try {
    await setDoc(getScheduleDoc(), config);
  } catch (err) {
    console.error('Error saving schedule config to Firestore:', err);
  }
}

/** Subscribe to schedule config in real time */
export function subscribeToScheduleConfig(callback: (config: ScheduleConfig) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    const fetchLocal = () => callback(getLocal<ScheduleConfig>('luxe_schedule', DEFAULT_SCHEDULE));
    fetchLocal();
    window.addEventListener('storage', fetchLocal);
    return () => window.removeEventListener('storage', fetchLocal);
  }

  return onSnapshot(
    getScheduleDoc(),
    (snap) => {
      if (!snap.exists()) {
        callback(DEFAULT_SCHEDULE);
        return;
      }
      const data = snap.data() as ScheduleConfig;
      const merged: ScheduleConfig = {
        ...DEFAULT_SCHEDULE,
        ...data,
        workDays: {
          ...DEFAULT_SCHEDULE.workDays,
          ...(data.workDays || {}),
        },
        customSlots: data.customSlots || DEFAULT_SCHEDULE.customSlots,
        blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
      };
      setLocal('luxe_schedule', merged);
      callback(merged);
    },
    (err) => {
      console.error('Real-time schedule subscription error:', err);
      getScheduleConfig().then(callback).catch(() => {});
    }
  );
}

/* ============================================================
   PRICING CONFIG
   ============================================================ */

function getPricingDoc() {
  return doc(db, 'config', 'pricing');
}

export const DEFAULT_PRICING: PricingConfig = {
  basePrices: {
    'standard': 140,
    'deep': 210,
    'move': 270,
    'post-construction': 320,
  },
  pricePerBedroom: 25,
  pricePerBathroom: 30,
  extras: [
    { id: 'oven', name: 'Inside Oven', price: 35, description: 'Deep degrease & bake-off interior' },
    { id: 'fridge', name: 'Inside Fridge', price: 35, description: 'Disinfect shelves & drawers' },
    { id: 'cabinets', name: 'Inside Cabinets', price: 35, description: 'Wipe & vacuum interior storage' },
    { id: 'windows', name: 'Interior Windows', price: 40, description: 'Glass, sills & trim detailed' },
    { id: 'pets', name: 'Pet Hair Treatment', price: 20, description: 'Specialized lint & fur removal' },
  ],
};

/** Get pricing configuration from Firestore or LocalStorage */
export async function getPricingConfig(): Promise<PricingConfig> {
  if (!isFirebaseConfigured) {
    return getLocal<PricingConfig>('luxe_pricing', DEFAULT_PRICING);
  }

  try {
    const snap = await getDoc(getPricingDoc());
    if (!snap.exists()) {
      await setDoc(getPricingDoc(), DEFAULT_PRICING);
      return DEFAULT_PRICING;
    }
    const data = snap.data() as PricingConfig;
    return {
      basePrices: { ...DEFAULT_PRICING.basePrices, ...data.basePrices },
      pricePerBedroom: data.pricePerBedroom ?? DEFAULT_PRICING.pricePerBedroom,
      pricePerBathroom: data.pricePerBathroom ?? DEFAULT_PRICING.pricePerBathroom,
      extras: data.extras || DEFAULT_PRICING.extras,
    };
  } catch (err) {
    console.error('Error loading pricing config:', err);
    return DEFAULT_PRICING;
  }
}

/** Update pricing configuration */
export async function updatePricingConfig(config: PricingConfig): Promise<void> {
  if (!isFirebaseConfigured) {
    setLocal('luxe_pricing', config);
    return;
  }

  await setDoc(getPricingDoc(), config);
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
  if (config.customSlots && config.customSlots.length > 0) {
    return config.customSlots;
  }

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
