'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link href={href} className={`px-3 py-2 rounded ${active ? 'bg-black text-white' : 'border'}`}>
      {children}
    </Link>
  );
}

export default function AdminNav() {
  return (
    <div className="flex gap-2 mb-4">
      <Item href="/enquiries">Enquiries</Item>
      <Item href="/jobs">Jobs</Item>
      <Item href="/appointments">Appointments</Item>
      <Item href="/appointments/new">New Appt</Item>
      <Item href="/quotes">Quotes</Item>
      <Item href="/admin/brand">Brand</Item>
      <Item href="/admin/status">Status</Item>
      <Item href="/tech">Tech</Item>
    </div>
  );
}
