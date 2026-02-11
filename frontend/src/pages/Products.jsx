import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';

export default function Products() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category_id: '', description: '', sizes: '', image_url: '' });
  const [catName, setCatName] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/?limit=100');
      setProducts(res.data.items);
      setTotal(res.data.total);
    } catch {} finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      setCategories(res.data);
    } catch {}
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category_id: '', description: '', sizes: '', image_url: '' });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, category_id: p.category_id || '', description: p.description || '', sizes: p.sizes || '', image_url: p.image_url || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, category_id: form.category_id || null };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success('Urun guncellendi');
      } else {
        await api.post('/products/', payload);
        toast.success('Urun eklendi');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu urunu silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Urun silindi');
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const handleCreateCategory = async () => {
    if (!catName.trim()) return;
    try {
      await api.post('/products/categories', { name: catName });
      toast.success('Kategori eklendi');
      setCatModalOpen(false);
      setCatName('');
      fetchCategories();
    } catch (err) { toast.error(err.response?.data?.detail || 'Hata'); }
  };

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Urun Katalogu" subtitle={`${total} urun`}>
        {isAdmin && (
          <>
            <button onClick={() => setCatModalOpen(true)} className="btn-secondary"><Plus size={18} /> Kategori</button>
            <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Yeni Urun</button>
          </>
        )}
      </PageHeader>

      {products.length === 0 ? (
        <EmptyState message="Henuz urun eklenmemis" icon={Package} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="card">
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              <h3 className="font-semibold">{p.name}</h3>
              {p.category_name && <span className="badge badge-info mt-1">{p.category_name}</span>}
              {p.description && <p className="text-sm text-dark-500 mt-2">{p.description}</p>}
              {p.sizes && <p className="text-xs text-dark-400 mt-1">Bedenler: {p.sizes}</p>}
              {isAdmin && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-dark-100">
                  <button onClick={() => openEdit(p)} className="text-dark-500 hover:text-dark-700"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Urun Duzenle' : 'Yeni Urun'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Urun Adi *</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kategori</label>
            <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className="select-field">
              <option value="">Kategori secin...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Aciklama</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bedenler (virgul ile)</label>
            <input value={form.sizes} onChange={(e) => update('sizes', e.target.value)} className="input-field" placeholder="S, M, L, XL" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gorsel URL</label>
            <input value={form.image_url} onChange={(e) => update('image_url', e.target.value)} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Guncelle' : 'Ekle'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title="Yeni Kategori">
        <div className="space-y-4">
          <input value={catName} onChange={(e) => setCatName(e.target.value)} className="input-field" placeholder="Kategori adi" />
          <div className="flex justify-end gap-3">
            <button onClick={() => setCatModalOpen(false)} className="btn-secondary">Iptal</button>
            <button onClick={handleCreateCategory} className="btn-primary">Ekle</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
