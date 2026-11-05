'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, ErrorText, Loading, PageHeader, TableWrap, td, th } from '@/components/ui';
import { api } from '@/lib/api';

interface OtpEntry {
  phone: string;
  code: string;
  sentAt: string;
}

const time = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'medium',
});

export default function OtpsPage() {
  const otps = useQuery({
    queryKey: ['/admin/otps'],
    queryFn: () => api<OtpEntry[]>('/admin/otps'),
    refetchInterval: 5000,
  });
  return (
    <>
      <PageHeader
        title="Login codes"
        description="Phase 1 has no SMS. When a customer asks for their code, read it out from here. Codes expire after a few minutes."
      />
      <Card>
        {otps.isPending ? (
          <Loading />
        ) : otps.error ? (
          <ErrorText error={otps.error} />
        ) : otps.data.length === 0 ? (
          <p className="text-sm text-zinc-500">No codes sent since the server started.</p>
        ) : (
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Phone</th>
                  <th className={th}>Code</th>
                  <th className={th}>Sent (IST)</th>
                </tr>
              </thead>
              <tbody>
                {otps.data.map((o) => (
                  <tr key={`${o.phone}-${o.sentAt}`}>
                    <td className={td}>{o.phone}</td>
                    <td className={`${td} font-mono text-base tracking-widest`}>{o.code}</td>
                    <td className={td}>{time.format(new Date(o.sentAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
