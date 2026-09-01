/** Tipo de dado de serviço */
export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

/** Tipo de imagem da galeria (exibição pública) */
export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
}

/** Dados do formulário de agendamento */
export interface BookingFormData {
  service: string;
  bedrooms: number;
  bathrooms: number;
  extras: string[];
  estimatedPrice: number;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

/** Dados do formulário de contato */
export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

/** Item de navegação */
export interface NavItem {
  label: string;
  href: string;
}

/* ============================================================
   TIPOS DO PAINEL ADMINISTRATIVO
   ============================================================ */

/** Agendamento salvo no Firestore */
export interface Booking {
  id: string;
  service: string;
  bedrooms?: number;
  bathrooms?: number;
  extras?: string[];
  estimatedPrice?: number;
  finalPrice?: number;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: unknown; // Timestamp do Firestore
}

/** Mensagem de contato salva no Firestore */
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: unknown; // Timestamp do Firestore
}

/** Configuração de agenda */
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
  startTime: string;   // ex: "08:00"
  endTime: string;     // ex: "17:00"
  slotDuration: number; // em minutos
  blockedDates: string[]; // formato YYYY-MM-DD
  customSlots?: string[]; // horários personalizados ex: ["8:00 AM", "10:30 AM", "1:00 PM"]
}

/** Configuração de preços salva no Firestore */
export interface PricingConfig {
  basePrices: Record<string, number>;
  pricePerBedroom: number;
  pricePerBathroom: number;
  extras: {
    id: string;
    name: string;
    price: number;
    description: string;
  }[];
}

/** Item da galeria salvo no Firestore */
export interface GalleryItem {
  id: string;
  src: string;          // URL pública do Firebase Storage
  storagePath: string;  // caminho interno para exclusão
  alt: string;
  category: string;
  createdAt: unknown;   // Timestamp do Firestore
}

/** Item de navegação do painel admin */
export interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
}
