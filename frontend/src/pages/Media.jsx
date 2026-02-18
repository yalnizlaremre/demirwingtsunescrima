import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Upload, Trash2, Image, Film, Play } from 'lucide-react';

export default function Media() {
  const { user, isAdmin, isManager } = useAuth();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [youtubeModal, setYoutubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [filter, setFilter] = useState('ALL');
  const fileRef = useRef(null);

  const canUpload = isAdmin || (isManager && user?.can_upload_media);

  useEffect(() => { fetchMedia(); }, [filter]);

  const fetchMedia = async () => {
    try {
      let url = '/media/';
      if (filter !== 'ALL') {
        url += `?media_type=${filter}`;
      }
      const res = await api.get(url);
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

  const handleYoutubeImport = async (e) => {
    e.preventDefault();
    if (!youtubeUrl) return;

    try {
      await api.post('/media/youtube', {
        youtube_url: youtubeUrl,
        title: youtubeTitle || null,
      });
      toast.success('YouTube video eklendi');
      setYoutubeModal(false);
      setYoutubeUrl('');
      setYoutubeTitle('');
      fetchMedia();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'YouTube import hatasi');
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
    if (!bytes || bytes === 0) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getYouTubeThumbnail = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Medya" subtitle={`${media.length} dosya`}>
        <div className="flex items-center gap-2">
          {canUpload && (
            <>
              <button
                onClick={() => setYoutubeModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Play size={16} /> YouTube Ekle
              </button>
              <label className={`btn-primary cursor-pointer flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={18} /> {uploading ? 'Yukleniyor...' : 'Dosya Yukle'}
                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
              </label>
            </>
          )}
        </div>
      </PageHeader>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'ALL', label: 'Tumu' },
          { key: 'IMAGE', label: 'Fotograflar' },
          { key: 'VIDEO', label: 'Videolar' },
          { key: 'YOUTUBE', label: 'YouTube' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {media.length === 0 ? (
        <EmptyState message="Henuz medya yuklenmemis" icon={Image} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map(m => (
            <div key={m.id} className="card p-3 group relative">
              {m.media_type === 'IMAGE' ? (
                <img src={m.file_url} alt={m.title || m.filename} className="w-full h-32 object-cover rounded-lg" />
              ) : m.media_type === 'YOUTUBE' ? (
                <a
                  href={m.youtube_url || m.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-32 rounded-lg overflow-hidden relative"
                >
                  {getYouTubeThumbnail(m.youtube_url || m.file_url) ? (
                    <img
                      src={getYouTubeThumbnail(m.youtube_url || m.file_url)}
                      alt={m.title || 'YouTube'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-red-50 flex items-center justify-center">
                      <Play size={32} className="text-red-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play size={32} className="text-white" />
                  </div>
                  <div className="absolute top-1 left-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded">
                    YT
                  </div>
                </a>
              ) : (
                <div className="w-full h-32 bg-dark-100 rounded-lg flex items-center justify-center">
                  <Film size={32} className="text-dark-400" />
                </div>
              )}
              <p className="text-xs text-dark-500 mt-2 truncate">{m.title || m.filename}</p>
              {m.media_type !== 'YOUTUBE' && <p className="text-xs text-dark-400">{formatSize(m.file_size)}</p>}
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

      {/* YouTube Import Modal */}
      <Modal isOpen={youtubeModal} onClose={() => setYoutubeModal(false)} title="YouTube Video Ekle">
        <form onSubmit={handleYoutubeImport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">YouTube Linki *</label>
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Baslik</label>
            <input
              value={youtubeTitle}
              onChange={(e) => setYoutubeTitle(e.target.value)}
              placeholder="Video basligi (opsiyonel)"
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setYoutubeModal(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Ekle</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
