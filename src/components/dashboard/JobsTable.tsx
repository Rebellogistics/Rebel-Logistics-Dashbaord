import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Job } from "@/lib/types";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobsTableProps {
  jobs: Job[];
}

export function JobsTable({ jobs }: JobsTableProps) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Shipping Reports</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[10px]">
            22 May 23 - 28 May 23
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            <TableHead className="w-12 text-[10px] uppercase font-bold">No</TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Recipient</TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Status</TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
            <TableHead className="text-[10px] uppercase font-bold">Fee</TableHead>
            <TableHead className="text-[10px] uppercase font-bold text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job, index) => (
            <TableRow key={job.id}>
              <TableCell className="text-xs text-muted-foreground">
                {(index + 1).toString().padStart(2, '0')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${job.customerName}`} 
                      alt={job.customerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{job.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">{job.customerPhone}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-md border-none",
                    job.status === 'Completed' && "bg-green-100 text-green-700",
                    job.status === 'In Delivery' && "bg-orange-100 text-orange-700",
                    job.status === 'Scheduled' && "bg-blue-100 text-blue-700",
                    job.status === 'Quote' && "bg-slate-100 text-slate-700"
                  )}
                >
                  {job.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{job.type}</TableCell>
              <TableCell className="text-xs font-semibold">${job.fee.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
