import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { FormCekNop } from '@/components/publik/cek/form-cek-nop';
import { NAMA_APLIKASI } from '@/config/brand';

export const metadata: Metadata = {
  title: `Cek NOP Peserta | ${NAMA_APLIKASI}`,
  description:
    'Cek status kepesertaan NOP PBB-P2 Anda dalam pengundian hadiah umroh gratis Kabupaten OKU Selatan.',
};

export default function HalamanCekNopPublik(): ReactElement {
  return <FormCekNop />;
}
