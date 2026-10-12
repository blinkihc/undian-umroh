import { PENYELENGGARA } from '@/config/brand';

export function FooterPublik() {
  return (
    <footer className="border-t border-neutral-300 bg-neutral-50">
      <div className="mx-auto max-w-[1280px] px-4 py-6 text-sm text-neutral-600 md:px-6">
        <p>Diselenggarakan oleh {PENYELENGGARA}.</p>
      </div>
    </footer>
  );
}
