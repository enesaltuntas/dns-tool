'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DomainPage() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    const domain = params.domain as string;
    if (domain) {
      // Redirect to main page with domain as query parameter
      router.replace(`/?domain=${encodeURIComponent(domain)}`);
    }
  }, [params.domain, router]);

  return null; // This component just redirects
}