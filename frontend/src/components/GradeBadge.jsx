import { Award } from 'lucide-react';
import { isNoGrade } from '../utils/grade';

// Kompakt (tablo hucresi) derece gosterimi: 0 = henuz 1. dereceyi almamis.
export default function GradeBadge({ grade, color = 'text-primary-500' }) {
  if (grade === '-' || grade === null || grade === undefined) {
    return <span className="text-dark-400">-</span>;
  }

  if (isNoGrade(grade)) {
    return <span className="badge badge-warning">Derece Yok (0)</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Award size={14} className={color} />
      {grade}
    </span>
  );
}
