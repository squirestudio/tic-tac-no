'use client';

import dynamic from 'next/dynamic';

const TicTacNo = dynamic(() => import('@/components/TicTacNo'), { ssr: false });

export default function Home() {
  return <TicTacNo />;
}
