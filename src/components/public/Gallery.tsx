import { useState, useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { useRevealOnScroll } from '../../hooks/useUtils';
import { getGalleryImages } from '../../lib/firestore';
import type { GalleryImage } from '../../types';
import './Gallery.css';

// Fallback images when Firestore is empty or unavailable
const FALLBACK_IMAGES: GalleryImage[] = [
  { id: '1', src: '/img/hero-bg.png', alt: 'Pristine living room after professional cleaning', category: 'Living Room' },
  { id: '2', src: '/img/gallery-kitchen.png', alt: 'Spotless modern kitchen', category: 'Kitchen' },
  { id: '3', src: '/img/gallery-bathroom.png', alt: 'Gleaming luxury bathroom', category: 'Bathroom' },
  { id: '4', src: '/img/gallery-bedroom.png', alt: 'Perfectly made bedroom', category: 'Bedroom' },
  { id: '5', src: '/img/gallery-kitchen.png', alt: 'Clean kitchen countertops', category: 'Kitchen' },
  { id: '6', src: '/img/hero-bg.png', alt: 'Elegant living space', category: 'Living Room' },
];

export default function Gallery() {
  const ref = useRevealOnScroll();
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const [images, setImages] = useState<GalleryImage[]>(FALLBACK_IMAGES);

  // Load gallery from Firestore or fallback
  useEffect(() => {
    getGalleryImages()
      .then(data => {
        if (data && data.length > 0) {
          setImages(data.map(item => ({
            id: item.id,
            src: item.src,
            alt: item.alt,
            category: item.category,
          })));
        }
      })
      .catch(() => { /* keep fallback images */ });
  }, []);

  return (
    <section className="gallery section section-gray" id="gallery">
      <div className="container" ref={ref}>
        <div className="section-header reveal">
          <span className="section-label" style={{ color: 'var(--color-gold-dark)' }}>Our Work</span>
          <h2 className="section-title" style={{ color: 'var(--color-black)' }}>Gallery</h2>
          <hr className="gold-line" />
          <p className="section-subtitle" style={{ color: 'var(--color-gray-600)' }}>
            See the LUXE A&amp;P difference — real results from real homes we've transformed.
          </p>
        </div>

        <div className="gallery__grid reveal">
          {images.map(img => (
            <button
              key={img.id}
              className="gallery__item"
              onClick={() => setLightbox(img)}
              aria-label={`View: ${img.alt}`}
            >
              <img src={img.src} alt={img.alt} className="gallery__img" loading="eager" />
              <div className="gallery__overlay">
                <ZoomIn size={24} />
                <span className="gallery__category">{img.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <>
          <div className="overlay" onClick={() => setLightbox(null)} />
          <div className="gallery__lightbox">
            <button className="gallery__lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">
              <X size={24} />
            </button>
            <img src={lightbox.src} alt={lightbox.alt} className="gallery__lightbox-img" />
            <p className="gallery__lightbox-caption">{lightbox.alt}</p>
          </div>
        </>
      )}
    </section>
  );
}
