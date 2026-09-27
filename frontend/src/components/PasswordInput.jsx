import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Sifreyi gizle' : 'Sifreyi goster'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 transition-colors"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
