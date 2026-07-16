import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';

const SUGGESTED_SLUGS = [
  { slug: 'anasayfa', label: 'Anasayfa' },
  { slug: 'demirwteo', label: 'DemirWteo' },
  { slug: 'iletisim', label: 'Iletisim' },
];

export default function SiteContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ slug: '', title: '', body: '', image_url: '', youtube_url: '' });

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
          {items.map((item) => (
            <div key={item.id} className="card">
              <div className="mb-4">
                <span className="badge bg-dark-100 text-dark-600">{item.slug}</span>
                <h3 className="font-semibold text-lg mt-2">{item.title || '(basliksiz)'}</h3>
                {item.body && <p className="text-sm text-dark-500 mt-1 line-clamp-3">{item.body}</p>}
                {item.image_url && <p className="text-xs text-dark-400 mt-2 truncate">Gorsel: {item.image_url}</p>}
                {item.youtube_url && <p className="text-xs text-dark-400 truncate">YouTube: {item.youtube_url}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(item)} className="btn-secondary btn-sm flex-1"><Edit2 size={16} /> Duzenle</button>
                <button onClick={() => handleDelete(item.id)} className="btn-danger btn-sm flex-1"><Trash2 size={16} /> Sil</button>
              </div>
            </div>
          ))}
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
            <label className="block text-sm font-medium mb-1">Gorsel URL</label>
            <input value={form.image_url} onChange={(e) => update('image_url', e.target.value)} className="input-field" placeholder="/uploads/... veya https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">YouTube Linki</label>
            <input value={form.youtube_url} onChange={(e) => update('youtube_url', e.target.value)} className="input-field" placeholder="https://www.youtube.com/watch?v=..." />
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
