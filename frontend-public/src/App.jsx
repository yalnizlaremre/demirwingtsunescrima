import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Anasayfa from './pages/Anasayfa';
import Okullar from './pages/Okullar';
import DemirWteo from './pages/DemirWteo';
import Egitmenler from './pages/Egitmenler';
import Medya from './pages/Medya';
import Iletisim from './pages/Iletisim';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <div className="min-h-screen bg-dark-900 text-ink flex flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Anasayfa />} />
          <Route path="/okullar" element={<Okullar />} />
          <Route path="/demirwteo" element={<DemirWteo />} />
          <Route path="/egitmenler" element={<Egitmenler />} />
          <Route path="/medya" element={<Medya />} />
          <Route path="/iletisim" element={<Iletisim />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
