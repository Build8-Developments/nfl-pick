import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ManualWeekSheet } from "@/data/manualResults";

type Props = {
  sheet: ManualWeekSheet;
};

export const ResultsSheet = ({ sheet }: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Week {sheet.week}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sheet.note && (
          <div className="text-sm text-muted-foreground">{sheet.note}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-md">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">#</th>
                {sheet.games.some((g) => g.away || g.home || g.spread) && (
                  <>
                    <th className="text-left p-2">Away</th>
                    <th className="text-left p-2">Spread</th>
                    <th className="text-left p-2">Home</th>
                  </>
                )}
                <th className="text-left p-2">Gavin</th>
                <th className="text-left p-2">Luke</th>
                <th className="text-left p-2">Mike</th>
              </tr>
            </thead>
            <tbody>
              {sheet.games.map((g) => {
                const showTeams = Boolean(g.away || g.home || g.spread);
                return (
                  <tr key={g.gameNumber} className="border-t">
                    <td className="p-2">{g.gameNumber}</td>
                    {showTeams && (
                      <>
                        <td className="p-2">{g.away || ""}</td>
                        <td className="p-2">{g.spread || ""}</td>
                        <td className="p-2">{g.home || ""}</td>
                      </>
                    )}
                    <td className="p-2">{g.gavin}</td>
                    <td className="p-2">{g.luke}</td>
                    <td className="p-2">{g.mike}</td>
                  </tr>
                );
              })}
              <tr className="border-t bg-muted/30">
                <td className="p-2 font-medium">Record</td>
                <td className="p-2">{sheet.record.gavin}</td>
                <td className="p-2">{sheet.record.luke}</td>
                <td className="p-2">{sheet.record.mike}</td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-medium">LOCK O.T.W (+1)</td>
                <td className="p-2">{sheet.lockOTW.gavin}</td>
                <td className="p-2">{sheet.lockOTW.luke}</td>
                <td className="p-2">{sheet.lockOTW.mike}</td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-medium">TD SCORER (+1)</td>
                <td className="p-2">{sheet.tdScorer.gavin}</td>
                <td className="p-2">{sheet.tdScorer.luke}</td>
                <td className="p-2">{sheet.tdScorer.mike}</td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-medium">PROP O.T.W</td>
                <td className="p-2">{sheet.propOTW.gavin}</td>
                <td className="p-2">{sheet.propOTW.luke}</td>
                <td className="p-2">{sheet.propOTW.mike}</td>
              </tr>
              <tr className="border-t bg-muted/30">
                <td className="p-2 font-medium">Total</td>
                <td className="p-2 font-semibold">{sheet.totals.gavin}</td>
                <td className="p-2 font-semibold">{sheet.totals.luke}</td>
                <td className="p-2 font-semibold">{sheet.totals.mike}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsSheet;


