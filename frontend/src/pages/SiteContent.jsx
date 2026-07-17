import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, Edit2, Trash2, FileText, Upload, X } from 'lucide-react';

const SUGGESTED_SLUGS = [
  { slug: 'anasayfa', label: 'Anasayfa' },
  { slug: 'demirwteo', label: 'DemirWteo' },
  { slug: 'iletisim', label: 'Iletisim' },
];

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function SiteContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ slug: '', title: '', body: '', image_url: '', youtube_url: '' });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchContent(); }, []);

  const fetchContent = async () => {
    try {
      const res = await api.get('/site-content/');
      setItems(res.data.items);
    } catch {} finally { setLoading(false); }
  };

  const openCreate = (slug = '') => {
    setEditing(null);
    setForm({ slug, title: '', body: '', image_url: '', youtube_url: '' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      slug: item.slug,
      title: item.title || '',
      body: item.body || '',
      image_url: item.image_url || '',
      youtube_url: item.youtube_url || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const { slug, ...payload } = form;
        await api.put(`/site-content/${editing.id}`, payload);
        toast.success('Icerik guncellendi');
      } else {
        await api.post('/site-content/', form);
        toast.success('Icerik olusturuldu');
      }
      setModalOpen(false);
      fetchContent();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu icerigi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/site-content/${id}`);
      toast.success('Icerik silindi');
      fetchContent();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const update = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      update('image_url', res.data.file_url);
      toast.success('Gorsel yuklendi');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Yukleme hatasi');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const youtubeId = getYouTubeId(form.youtube_url);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Site Icerigi" subtitle="Tanitim sitesindeki metin, gorsel ve video icerikleri">
        <button onClick={() => openCreate()} className="btn-primary"><Plus size={18} /> Yeni Icerik</button>
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2">
        {SUGGESTED_SLUGS.map((s) => (
          <button key={s.slug} onClick={() => openCreate(s.slug)} className="btn-secondary btn-sm">
            <Plus size={14} /> {s.label} icerigi ekle
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState message="Henuz site icerigi eklenmemis" icon={FileText} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const ytId = getYouTubeId(item.youtube_url);
            return (
              <div key={item.id} className="card">
                {item.image_url && (
                  <img src={item.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
                )}
                <div className="mb-4">
                  <span className="badge bg-dark-100 text-dark-600">{item.slug}</span>
                  <h3 className="font-semibold text-lg mt-2">{item.title || '(basliksiz)'}</h3>
                  {item.body && <p className="text-sm text-dark-500 mt-1 line-clamp-3">{item.body}</p>}
                  {item.youtube_url && (
                    <div className="flex items-center gap-2 mt-2">
                      {ytId && <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} alt="" className="h-10 w-auto rounded" />}
                      <span className="text-xs text-dark-400">{ytId ? 'YouTube videosu eklendi' : 'YouTube linki taninamadi'}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="btn-secondary btn-sm flex-1"><Edit2 size={16} /> Duzenle</button>
                  <button onClick={() => handleDelete(item.id)} className="btn-danger btn-sm flex-1"><Trash2 size={16} /> Sil</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Icerik Duzenle' : 'Yeni Icerik'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Slug (sayfa anahtari) *</label>
            <input
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              className="input-field"
              placeholder="orn: anasayfa, demirwteo, iletisim"
              required
              disabled={!!editing}
            />
            <p className="text-xs text-dark-400 mt-1">Ayni slug'a birden fazla icerik eklenebilir; hepsi sayfada sirayla gosterilir.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Baslik</label>
            <input value={form.title} onChange={(e) => update('title', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Metin</label>
            <textarea value={form.body} onChange={(e) => update('body', e.target.value)} className="input-field" rows={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gorsel</label>
            {form.image_url && (
              <div className="relative mb-2 inline-block">
                <img src={form.image_url} alt="" className="h-28 w-auto rounded-lg border border-dark-700 object-cover" />
                <button
                  type="button"
                  onClick={() => update('image_url', '')}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                  title="Gorseli kaldir"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className={`btn-secondary btn-sm cursor-pointer flex items-center gap-1.5 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={14} /> {uploading ? 'Yukleniyor...' : 'Dosya Sec'}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <span className="text-xs text-dark-400">veya asagiya link yapistir</span>
            </div>
            <input
              value={form.image_url}
              onChange={(e) => update('image_url', e.target.value)}
              className="input-field mt-2"
              placeholder="/uploads/... veya https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">YouTube Linki</label>
            <input
              value={form.youtube_url}
              onChange={(e) => update('youtube_url', e.target.value)}
              className="input-field"
              placeholder="Video linkini yapistir (izleme, kisa yada paylas linki fark etmez)"
            />
            {form.youtube_url && (
              youtubeId ? (
                <div className="mt-2 flex items-center gap-2">
                  <img src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} alt="" className="h-16 w-auto rounded-lg border border-dark-700" />
                  <span className="text-xs text-green-500">Video taninidi, sayfada bu sekilde gorunecek</span>
                </div>
              ) : (
                <p className="text-xs text-red-500 mt-1">Bu linkten video taninamadi, YouTube linkini kontrol edin</p>
              )
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Guncelle' : 'Olustur'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
