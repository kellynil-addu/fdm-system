'use client';

import { FileCheck, FileClock, FolderArchive, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { IconBox } from '@/components/ui/icon-box';
import type { LegalTab } from '@/lib/hooks/use-land-titles';

interface TitleStatsStripProps {
  counts: {
    all: number;
    intake: number;
    preparation: number;
    review: number;
    clearance: number;
    ready: number;
    released: number;
  };
  activeTab: LegalTab;
  onSelectTab: (tab: LegalTab) => void;
}

export function TitleStatsStrip({ counts, activeTab, onSelectTab }: TitleStatsStripProps) {
  const stats = [
    {
      id: 'intake' as LegalTab,
      label: 'Intake Queue',
      count: counts.intake,
      subtext: 'Awaiting legal intake',
      icon: Inbox,
    },
    {
      id: 'preparation' as LegalTab,
      label: 'In Preparation',
      count: counts.preparation + counts.review,
      subtext: 'Drafting & review',
      icon: FileClock,
    },
    {
      id: 'clearance' as LegalTab,
      label: 'Clearance Period',
      count: counts.clearance,
      subtext: '30-day internal clearance',
      icon: FileCheck,
    },
    {
      id: 'ready' as LegalTab,
      label: 'Ready for Claim',
      count: counts.ready,
      subtext: 'In vault for client pickup',
      icon: FolderArchive,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeTab === stat.id;
        return (
          <Card
            key={stat.id}
            variant="interactive"
            padding="sm"
            onClick={() => onSelectTab(stat.id)}
            className={`p-4 transition-all duration-150 ${
              isActive ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <IconBox size="sm" shape="square">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </IconBox>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">{stat.count}</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{stat.subtext}</p>
          </Card>
        );
      })}
    </div>
  );
}
