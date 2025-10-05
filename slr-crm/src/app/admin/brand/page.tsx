import { prisma } from '../../../lib/db';
import { revalidatePath } from 'next/cache';

import AdminNav from '../../../components/AdminNav';

export default async function BrandSettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  async function save(formData: FormData) {
    'use server';
    const data = {
      brandName: String(formData.get('brandName') || ''),
      brandWebsite: String(formData.get('brandWebsite') || ''),
      brandPrimaryColor: String(formData.get('brandPrimaryColor') || ''),
      brandLogoUrl: String(formData.get('brandLogoUrl') || ''),
      bookingsEmail: String(formData.get('bookingsEmail') || '')
    };
    await prisma.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    revalidatePath('/admin/brand');
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl p-4 shadow">
      <h1 className="text-xl font-bold mb-4">Brand Settings</h1>
      <form action={save} className="space-y-3">
        <label className="block">
          <span className="text-sm">Brand Name</span>
          <input name="brandName" defaultValue={settings?.brandName || ''} className="border rounded p-2 w-full" />
        </label>
        <label className="block">
          <span className="text-sm">Website</span>
          <input name="brandWebsite" defaultValue={settings?.brandWebsite || ''} className="border rounded p-2 w-full" />
        </label>
        <label className="block">
          <span className="text-sm">Primary Color (hex)</span>
          <input name="brandPrimaryColor" defaultValue={settings?.brandPrimaryColor || ''} className="border rounded p-2 w-full" />
        </label>
        <label className="block">
          <span className="text-sm">Logo URL (PNG/JPG)</span>
          <input name="brandLogoUrl" defaultValue={settings?.brandLogoUrl || ''} className="border rounded p-2 w-full" />
        </label>
        <label className="block">
          <span className="text-sm">Bookings Email</span>
          <input name="bookingsEmail" defaultValue={settings?.bookingsEmail || ''} className="border rounded p-2 w-full" />
        </label>
        <button type="submit" className="px-4 py-2 rounded bg-black text-white">Save</button>
      </form>
    </div>
  );
}
