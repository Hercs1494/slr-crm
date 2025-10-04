import { prisma } from '@/lib/db';
import AdminNav from '@/components/AdminNav';
import RealtimeRefresher from '@/components/RealtimeRefresher';

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({ include: { customer: true, appointments: true }, orderBy: { id: 'desc' }, take: 50 });
  return (
    <div>
      <AdminNav />
      <RealtimeRefresher tables={['job','appointment']} />
      <h2 className="text-xl font-semibold">Jobs</h2>
      <ul className="mt-4 space-y-2">
        {jobs.map(j => (
          <li key={j.id} className="rounded-xl border p-3 bg-white">
            <div className="font-medium">{j.customer.firstName} {j.customer.lastName}</div>
            <div className="text-sm text-gray-600">Status: {j.status} — Appointments: {j.appointments.length} — <a className="underline" href={`/jobs/${j.id}/media`}>Add media</a></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
