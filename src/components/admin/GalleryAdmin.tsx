/**
 * Admin Gallery — upload, manage, and delete work photos.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ImagePlus,
  Trash2,
  Upload,
  X,
  RefreshCw,
  Tag,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { getGalleryImages, addGalleryImage, deleteGalleryImage } from '../../lib/firestore';
import { uploadGalleryImage, deleteStorageFile } from '../../lib/storage';
import type { GalleryItem } from '../../types';
import './GalleryAdmin.css';

const CATEGORIES = [
  'Sala de Estar',
  'Cozinha',
  'Banheiro',
  'Quarto',
  'Escritório',
  'Antes e Depois',
  'Outros',
];

export default function GalleryAdmin() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]);
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGalleryImages();
      setImages(data);
    } catch (err) {
      console.error('Failed to fetch gallery:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB.');
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = e => setUploadPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setShowUpload(true);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadProgress(20);

    try {
      // Upload to Storage
      setUploadProgress(40);
      const { url, storagePath } = await uploadGalleryImage(uploadFile);
      setUploadProgress(70);

      // Save metadata to Firestore
      await addGalleryImage({
        src: url,
        storagePath,
        alt: uploadAlt || `Limpeza de ${uploadCategory}`,
        category: uploadCategory,
      });
      setUploadProgress(100);

      // Reset and refresh
      setTimeout(() => {
        resetUpload();
        fetchImages();
      }, 500);
    } catch (err) {
      console.error('Failed to upload:', err);
      alert('Falha no envio da imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (img: GalleryItem) => {
    if (!confirm('Excluir esta foto? Esta ação não pode ser desfeita.')) return;
    setDeleting(img.id);
    try {
      // Delete from Storage
      if (img.storagePath) {
        await deleteStorageFile(img.storagePath);
      }
      // Delete from Firestore
      await deleteGalleryImage(img.id);
      setImages(prev => prev.filter(i => i.id !== img.id));
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(null);
    }
  };

  const resetUpload = () => {
    setShowUpload(false);
    setUploadFile(null);
    setUploadPreview('');
    setUploadCategory(CATEGORIES[0]);
    setUploadAlt('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="gallery-admin">
      {/* Header */}
      <div className="gallery-admin__header">
        <div>
          <h1 className="gallery-admin__title">Galeria de Fotos</h1>
          <p className="gallery-admin__subtitle">{images.length} foto{images.length !== 1 ? 's' : ''} cadastrada{images.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="gallery-admin__actions">
          <button className="gallery-admin__refresh" onClick={fetchImages} aria-label="Atualizar">
            <RefreshCw size={18} />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={16} />
            Adicionar Foto
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <>
          <div className="overlay" onClick={resetUpload} />
          <div className="gallery-admin__upload-modal">
            <div className="gallery-admin__upload-header">
              <h3>Enviar Nova Foto</h3>
              <button onClick={resetUpload} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            {uploadPreview && (
              <div className="gallery-admin__upload-preview">
                <img src={uploadPreview} alt="Prévia" />
              </div>
            )}

            <div className="gallery-admin__upload-fields">
              <div className="gallery-admin__upload-field">
                <label>
                  <Tag size={14} />
                  Categoria
                </label>
                <select
                  className="schedule__input schedule__select"
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="gallery-admin__upload-field">
                <label>
                  <FileText size={14} />
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  className="schedule__input"
                  placeholder="Ex: Cozinha limpa e higienizada..."
                  value={uploadAlt}
                  onChange={e => setUploadAlt(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>

            {uploading && (
              <div className="gallery-admin__progress">
                <div
                  className="gallery-admin__progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <div className="gallery-admin__upload-actions">
              <button className="btn btn-secondary btn-sm" onClick={resetUpload} disabled={uploading}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
              >
                {uploading ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Enviar Foto
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Drag & Drop area */}
      <div
        className="gallery-admin__dropzone"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={32} />
        <p>Arraste e solte uma foto aqui, ou clique para buscar</p>
        <span>JPEG, PNG, WebP — Máx 10MB</span>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="gallery-admin__loading">
          <div className="spinner" style={{ color: 'var(--color-gold)' }} />
        </div>
      ) : images.length === 0 ? (
        <div className="gallery-admin__empty">
          <ImageIcon size={48} />
          <p>Nenhuma foto cadastrada ainda. Envie a primeira foto dos seus serviços!</p>
        </div>
      ) : (
        <div className="gallery-admin__grid">
          {images.map(img => (
            <div key={img.id} className="gallery-admin__item">
              <img
                src={img.src}
                alt={img.alt}
                className="gallery-admin__img"
                loading="lazy"
              />
              <div className="gallery-admin__item-overlay">
                <span className="gallery-admin__item-category">{img.category}</span>
                <button
                  className="gallery-admin__item-delete"
                  onClick={() => handleDelete(img)}
                  disabled={deleting === img.id}
                  aria-label="Excluir foto"
                >
                  {deleting === img.id ? (
                    <span className="spinner spinner-sm" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
