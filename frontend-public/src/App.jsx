import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Anasayfa from './pages/Anasayfa';
import Okullar from './pages/Okullar';
import DemirWteo from './pages/DemirWteo';
import Egitmenler from './pages/Egitmenler';
import Iletisim from './pages/Iletisim';

export default function App() {
  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Anasayfa />} />
          <Route path="/okullar" element={<Okullar />} />
          <Route path="/demirwteo" element={<DemirWteo />} />
          <Route path="/egitmenler" element={<Egitmenler />} />
          <Route path="/iletisim" element={<Iletisim />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
