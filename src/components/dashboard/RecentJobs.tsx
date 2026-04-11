import { Job } from '@/lib/types';
import { JobsTable } from '@/components/dashboard/JobsTable';
import { ArrowRight } from 'lucide-react';

interface RecentJobsProps {
  jobs: Job[];
  onViewAll: () => void;
}

export function RecentJobs({ jobs, onViewAll }: RecentJobsProps) {
  const recent = [...jobs]
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, 8);

  return (
    <section>
      <header className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold tracking-tight text-rebel-text">
            Recent Jobs
          </h2>
          <p className="mt-1 text-[12px] text-rebel-text-tertiary">
            The last {recent.length} jobs across every status
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-semibold text-rebel-accent hover:bg-rebel-accent-surface transition-colors"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      <JobsTable jobs={recent} title="Recent activity" showNewQuoteButton={false} showStatusFilters={false} />
    </section>
  );
}
