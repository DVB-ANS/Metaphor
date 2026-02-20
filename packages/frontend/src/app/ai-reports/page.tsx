import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { getRiskColor } from '@/lib/mock-data';

const mockReports = [
  {
    id: 'report-1',
    vaultName: 'EM Corporate',
    date: '2026-02-18',
    score: 67,
    riskLevel: 'high' as const,
    summary: 'Geographic concentration risk in Italian invoices. Recommend reducing exposure.',
    recommendations: [
      'Reduce Italy exposure from 25% to 15%',
      'Reallocate 10% to French sovereign bonds',
    ],
    stressTests: [
      { scenario: 'ECB rate +1%', impact: '-2.8%' },
      { scenario: 'ECB rate +2%', impact: '-5.4%' },
      { scenario: 'Italy default', impact: '-18.2%' },
    ],
  },
  {
    id: 'report-2',
    vaultName: 'Fixed Income EU',
    date: '2026-02-15',
    score: 42,
    riskLevel: 'moderate' as const,
    summary: 'Well-diversified portfolio with moderate duration risk.',
    recommendations: ['Consider adding interest rate hedging (swap)'],
    stressTests: [
      { scenario: 'ECB rate +1%', impact: '-1.2%' },
      { scenario: 'ECB rate +2%', impact: '-2.5%' },
    ],
  },
  {
    id: 'report-3',
    vaultName: 'US Treasury Pool',
    date: '2026-02-10',
    score: 18,
    riskLevel: 'low' as const,
    summary: 'Low-risk sovereign portfolio. No action required.',
    recommendations: [],
    stressTests: [
      { scenario: 'Fed rate +1%', impact: '-0.8%' },
      { scenario: 'Fed rate +2%', impact: '-1.6%' },
    ],
  },
];

function getRiskIcon(level: 'low' | 'moderate' | 'high') {
  switch (level) {
    case 'low':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'moderate':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'high':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
}

export default function AIReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Reports</h1>
        <p className="text-muted-foreground">
          Risk analysis powered by 0G Compute
        </p>
      </div>

      <div className="space-y-4">
        {mockReports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{report.vaultName}</CardTitle>
                    <CardDescription>{report.date}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRiskIcon(report.riskLevel)}
                  <span className={`text-lg font-bold ${getRiskColor(report.riskLevel)}`}>
                    {report.score}/100
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{report.summary}</p>

              {report.recommendations.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Recommendations</p>
                  <ul className="space-y-1">
                    {report.recommendations.map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">Stress Tests</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {report.stressTests.map((test, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{test.scenario}</p>
                      <p className="text-sm font-bold text-red-400">{test.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Badge variant="outline">0G Compute</Badge>
                {report.recommendations.length > 0 && (
                  <Badge variant="secondary">
                    {report.recommendations.length} action(s)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
