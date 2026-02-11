import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Upload, Trash2, Image, Film } from 'lucide-react';

export default function Media() {
  const { isAdmin } = useAuth();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchMedia(); }, []);

  const fetchMedia = async () => {
    try {
      const res = await api.get('/media/');
      setMedia(res.data);
    } catch {} finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Dosya yuklendi');
      fetchMedia();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Yukleme hatasi');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu medyayi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/media/${id}`);
      toast.success('Medya silindi');
      fetchMedia();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Medya Yonetimi" subtitle={`${media.length} dosya`}>
        <label className={`btn-primary cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload size={18} /> {uploading ? 'Yukleniyor...' : 'Dosya Yukle'}
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
        </label>
      </PageHeader>

      {media.length === 0 ? (
        <EmptyState message="Henuz medya yuklenmemis" icon={Image} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map(m => (
            <div key={m.id} className="card p-3 group relative">
              {m.media_type === 'IMAGE' ? (
                <img src={m.file_url} alt={m.filename} className="w-full h-32 object-cover rounded-lg" />
              ) : (
                <div className="w-full h-32 bg-dark-100 rounded-lg flex items-center justify-center">
                  <Film size={32} className="text-dark-400" />
                </div>
              )}
              <p className="text-xs text-dark-500 mt-2 truncate">{m.filename}</p>
              <p className="text-xs text-dark-400">{formatSize(m.file_size)}</p>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(m.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
