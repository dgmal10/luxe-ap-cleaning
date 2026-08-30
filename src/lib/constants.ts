import type { Service, NavItem } from '../types';

/** Navigation links */
export const NAV_ITEMS: NavItem[] = [
  { label: 'About', href: 'about' },
  { label: 'Services', href: 'services' },
  { label: 'Gallery', href: 'gallery' },
  { label: 'Book Now', href: 'booking' },
  { label: 'Contact', href: 'contact' },
];

/** Services configuration */
export const SERVICES: Service[] = [
  {
    id: 'standard',
    name: 'Standard Cleaning',
    description: 'Regular maintenance cleaning to keep your home fresh, tidy, and welcoming. Perfect for weekly or bi-weekly upkeep.',


    icon: 'sparkles',
    features: [
      'Dusting all surfaces & furniture',
      'Vacuuming & mopping floors',
      'Kitchen & bathroom sanitizing',
      'Trash removal & bed making',
    ],
  },
  {
    id: 'deep',
    name: 'Deep Cleaning',
    description: 'A thorough, top-to-bottom cleaning for homes that need extra attention. Ideal for seasonal refreshes or first-time clients.',


    icon: 'shield-check',
    features: [
      'Everything in Standard Cleaning',
      'Inside appliances & cabinets',
      'Baseboards, vents & light fixtures',
      'Detailed scrubbing & descaling',
    ],
  },
  {
    id: 'move',
    name: 'Move In / Move Out',
    description: 'Leave your old place spotless or start fresh in your new home. Designed to meet landlord and lease requirements.',


    icon: 'home',
    features: [
      'Full deep cleaning included',
      'Inside all closets & storage',
      'Appliance interior cleaning',
      'Window sills & tracks detailed',
    ],
  },
  {
    id: 'post-construction',
    name: 'Post-Construction',
    description: 'Specialized cleanup after renovations or construction work. We remove dust, debris, and residue so you can enjoy your new space.',


    icon: 'hammer',
    features: [
      'Construction dust removal',
      'Surface polishing & wiping',
      'Window & glass cleaning',
      'Final detail & inspection',
    ],
  },
];

/** Cleaning Add-ons (Extras) */
export interface CleaningExtra {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const CLEANING_EXTRAS: CleaningExtra[] = [
  { id: 'oven', name: 'Inside Oven', price: 35, description: 'Deep degrease & bake-off interior' },
  { id: 'fridge', name: 'Inside Fridge', price: 35, description: 'Disinfect shelves & drawers' },
  { id: 'cabinets', name: 'Inside Cabinets', price: 35, description: 'Wipe & vacuum interior storage' },
  { id: 'windows', name: 'Interior Windows', price: 40, description: 'Glass, sills & trim detailed' },
  { id: 'pets', name: 'Pet Hair Treatment', price: 20, description: 'Specialized lint & fur removal' },
];

/** Base price for 1 Bedroom / 1 Bathroom */
export const BASE_PRICING: Record<string, number> = {
  'standard': 140,
  'deep': 210,
  'move': 270,
  'post-construction': 320,
};

export const PRICE_PER_EXTRA_BEDROOM = 25;
export const PRICE_PER_EXTRA_BATHROOM = 30;

/** Calculate estimated price in USD */
export function calculateEstimatedPrice(
  serviceId: string,
  bedrooms: number,
  bathrooms: number,
  selectedExtras: string[]
): number {
  const base = BASE_PRICING[serviceId] || 140;
  const extraBeds = Math.max(0, bedrooms - 1) * PRICE_PER_EXTRA_BEDROOM;
  const extraBaths = Math.max(0, bathrooms - 1) * PRICE_PER_EXTRA_BATHROOM;
  const extrasTotal = selectedExtras.reduce((sum, extraId) => {
    const extra = CLEANING_EXTRAS.find(e => e.id === extraId);
    return sum + (extra ? extra.price : 0);
  }, 0);

  return base + extraBeds + extraBaths + extrasTotal;
}

/** Available time slots (placeholder) */
export const TIME_SLOTS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
];

/** Business info placeholders */
export const BUSINESS = {
  name: 'LUXE A&P Cleaning',
  tagline: 'Premium Residential Services',
  phone: '+1 (774) 360-4824',
  email: 'luxeaepcleaning@gmail.com',
  address: '123 Main Street',
  city: 'Worcester',
  state: 'MA',
  zip: '01604',
  whatsapp: 'https://wa.me/17743604824',
  instagram: '#',
  facebook: '#',
  tiktok: '#',
};
