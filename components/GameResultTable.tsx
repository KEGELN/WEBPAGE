'use client';

type GameDetailCell = string | number | null | undefined;
type GameDetailRow = GameDetailCell[];

function displayValue(value: GameDetailCell) {
  const raw = String(value ?? '').trim();
  return raw && raw !== 'undefined' ? raw : '-';
}

export default function GameResultTable({ rows }: { rows: GameDetailRow[] }) {
  if (!rows || rows.length === 0) return null;

  const totalRow = rows.find((r) => r?.[0] === '' && r?.[15] === '' && r?.[5] && r?.[10]);
  const leftTotal = totalRow ? Number(totalRow[5]) : null;
  const rightTotal = totalRow ? Number(totalRow[10]) : null;
  const diff =
    leftTotal !== null && rightTotal !== null && !Number.isNaN(leftTotal) && !Number.isNaN(rightTotal)
      ? leftTotal - rightTotal
      : null;
  const diffLabel = diff === null ? '' : diff > 0 ? `+${diff}-` : diff < 0 ? `${diff}+` : '0';

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-gradient-to-br from-red-500/10 via-background to-rose-500/5">
      <table className="min-w-full table-fixed bg-card/90 text-sm">
        <thead className="bg-muted/70">
          <tr>
            <th className="w-[16rem] px-3 py-2 text-right">Spieler</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">1</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">2</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">3</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">4</th>
            <th className="px-2 py-2 text-center">Kegel</th>
            <th className="px-2 py-2 text-center">SP</th>
            <th className="px-2 py-2 text-center">MP</th>
            <th className="w-10 px-2 py-2 text-center"></th>
            <th className="px-2 py-2 text-center">MP</th>
            <th className="px-2 py-2 text-center">SP</th>
            <th className="px-2 py-2 text-center">Kegel</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">4</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">3</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">2</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">1</th>
            <th className="w-[16rem] px-3 py-2 text-left">Spieler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isNoteRow =
              row.length > 16 || (row?.[0] && row.slice(1).every((v) => v === '' || v === undefined));
            if (isNoteRow) {
              return (
                <tr key={`note-${idx}`}>
                  <td colSpan={17} className="px-3 py-2 text-sm text-muted-foreground">
                    {row[0] || ''}
                  </td>
                </tr>
              );
            }

            const isTotals = row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10];

            const nameLeft = row[0];
            const set1 = row[1];
            const set2 = row[2];
            const set3 = row[3];
            const set4 = row[4];
            const kegelLeft = row[5];
            const spLeft = row[6];
            const mpLeft = row[7];

            const mpRight = row[8];
            const spRight = row[9];
            const kegelRight = row[10];
            const set4Right = row[11];
            const set3Right = row[12];
            const set2Right = row[13];
            const set1Right = row[14];
            const nameRight = row[15];

            return (
              <tr key={`row-${idx}`} className="border-b border-border">
                <td className="truncate px-3 py-2 text-right">{displayValue(nameLeft)}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">{displayValue(set1)}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">{displayValue(set2)}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">{displayValue(set3)}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">{displayValue(set4)}</td>
                <td className="px-2 py-2 text-center">{displayValue(kegelLeft)}</td>
                <td className="px-2 py-2 text-center">{displayValue(spLeft)}</td>
                <td className="px-2 py-2 text-center">{displayValue(mpLeft)}</td>
                <td className="px-2 py-2 text-center font-semibold text-primary">{isTotals ? diffLabel : ''}</td>
                <td className="px-2 py-2 text-center">{displayValue(mpRight)}</td>
                <td className="px-2 py-2 text-center">{displayValue(spRight)}</td>
                <td className="px-2 py-2 text-center">{displayValue(kegelRight)}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">{displayValue(set4Right)}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">{displayValue(set3Right)}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">{displayValue(set2Right)}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">{displayValue(set1Right)}</td>
                <td className="truncate px-3 py-2 text-left">{displayValue(nameRight)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
