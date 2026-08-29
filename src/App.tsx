import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Hero from './components/public/Hero';
import About from './components/public/About';
import Services from './components/public/Services';
import Gallery from './components/public/Gallery';
import Booking from './components/public/Booking';
import Contact from './components/public/Contact';

// Admin code-split for performance
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/admin/ProtectedRoute';

const AdminLogin = lazy(() => import('./components/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const Dashboard = lazy(() => import('./components/admin/Dashboard'));
const Messages = lazy(() => import('./components/admin/Messages'));
const Schedule = lazy(() => import('./components/admin/Schedule'));
const GalleryAdmin = lazy(() => import('./components/admin/GalleryAdmin'));

function AdminLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-primary)',
      }}
    >
      <div className="spinner spinner-lg" style={{ color: 'var(--color-gold)' }} />
    </div>
  );
}

/** Public landing page — all sections on one page */
function LandingPage() {
  // Intersection Observer for scroll-reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );

    const observeAll = () => {
      const revealEls = document.querySelectorAll('.reveal:not(.visible)');
      revealEls.forEach(el => observer.observe(el));
    };

    observeAll();

    // Listen for DOM changes to observe dynamically loaded elements
    const mutationObserver = new MutationObserver(() => {
      observeAll();
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Gallery />
        <Booking />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<AdminLoadingFallback />}>
        <Routes>
          {/* Public site */}
          <Route path="/" element={<LandingPage />} />

          {/* Admin login (no auth required) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin area (auth required) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="messages" element={<Messages />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="gallery" element={<GalleryAdmin />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
