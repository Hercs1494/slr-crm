import { prisma } from '@/lib/db';
import AdminNav from '@/components/AdminNav';
import RealtimeRefresher from '../../../components/RealtimeRefresher';
import dynamic from 'next/dynamic';
const MapThumb = dynamic(() => import('@/components/MapThumb'), { ssr: false });

export default async function AppointmentsPage() {
  const appts = await prisma.appointment.findMany({ include: { job: { include: { customer: true } } }, orderBy: { startAt: 'asc' }, take: 100 });
  return (
    <div>
      <AdminNav />
      <RealtimeRefresher tables={['appointment']} />
      <h2 className="text-xl font-semibold">Appointments</h2>
      <table className="mt-4 w-full text-sm">
        <thead><tr><th className="text-left p-2">Customer</th><th className="p-2">Start</th><th className="p-2">End</th><th className="p-2">Location</th><th className="p-2">Tech</th><th className="p-2">GPS</th></tr></thead>
        <tbody>
          {appts.map(a => (
            <tr key={a.id} className="border-t">
              <td className="p-2">{a.job.customer.firstName} {a.job.customer.lastName}</td>
              <td className="p-2">{new Date(a.startAt).toLocaleString('en-GB')}</td>
              <td className="p-2">{new Date(a.endAt).toLocaleString('en-GB')}</td>
              <td className="p-2">{a.location || '-'}</td>
              <td className="p-2">
                <form action={`/api/appointments/${'${a.id}'}/assign`} method="post" className="flex gap-1">
                  <input name="tech" defaultValue={a.technician || ''} placeholder="Name" className="border rounded px-1 py-0.5 text-xs w-28" />
                  <button className="px-2 py-0.5 border rounded text-xs">Save</button>
                </form>
              </td>
            </tr>
          ))}
        {appts.map(a => null)}
        </tbody>
      </table>
    </div>
  );
}
