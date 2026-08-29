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
  email: 'annapaulasoouza98@icloud.com',
  address: '123 Main Street',
  city: 'Worcester',
  state: 'MA',
  zip: '01604',
  whatsapp: 'https://wa.me/17743604824',
  instagram: '#',
  facebook: '#',
  tiktok: '#',
};
