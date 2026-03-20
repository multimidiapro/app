'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStudies } from '@/lib/db';

export default function StudyIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const loadAndRedirect = async () => {
      const history = await getStudies();
      if (history && history.length > 0) {
        router.replace(`/study/${history[0].id}?sidebar=open`);
        return;
      }
      
      // If no history, create a new study
      const newId = crypto.randomUUID();
      router.replace(`/study/${newId}`);
    };
    
    loadAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
