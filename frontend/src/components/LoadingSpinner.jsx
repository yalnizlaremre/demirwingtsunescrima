export default function LoadingSpinner({ text = 'Yukleniyor...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent mb-3"></div>
      <p className="text-dark-500 text-sm">{text}</p>
    </div>
  );
}
