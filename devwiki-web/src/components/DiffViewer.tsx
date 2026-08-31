import { useMemo } from 'react';
import { diffLines, type Change } from 'diff';
import './DiffViewer.css';

interface Props {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}

const CONTEXT_LINES = 3; // số dòng context hiển thị xung quanh mỗi thay đổi

interface DiffBlock {
  type: 'change' | 'context' | 'collapsed';
  lines: { type: 'added' | 'removed' | 'unchanged'; text: string; lineNo?: number }[];
  collapsedCount?: number;
}

function buildBlocks(changes: Change[]): DiffBlock[] {
  // Flatten changes thành mảng dòng phẳng
  type FlatLine = { type: 'added' | 'removed' | 'unchanged'; text: string };
  const flat: FlatLine[] = [];

  for (const change of changes) {
    const lines = change.value.split('\n');
    // bỏ dòng trống cuối nếu có (do split)
    if (lines[lines.length - 1] === '') lines.pop();

    const type = change.added ? 'added' : change.removed ? 'removed' : 'unchanged';
    for (const line of lines) {
      flat.push({ type, text: line });
    }
  }

  // Xác định index các dòng thay đổi
  const changedIndices = new Set<number>();
  flat.forEach((line, i) => {
    if (line.type !== 'unchanged') changedIndices.add(i);
  });

  // Tính range hiển thị (changed ± CONTEXT_LINES)
  const visible = new Set<number>();
  changedIndices.forEach((i) => {
    for (let j = Math.max(0, i - CONTEXT_LINES); j <= Math.min(flat.length - 1, i + CONTEXT_LINES); j++) {
      visible.add(j);
    }
  });

  if (visible.size === 0) {
    // Không có thay đổi
    return [];
  }

  // Group thành blocks
  const blocks: DiffBlock[] = [];
  let i = 0;

  while (i < flat.length) {
    if (!visible.has(i)) {
      // Tìm khoảng collapsed
      let j = i;
      while (j < flat.length && !visible.has(j)) j++;
      blocks.push({ type: 'collapsed', lines: [], collapsedCount: j - i });
      i = j;
    } else {
      // Collect visible lines
      const blockLines: DiffBlock['lines'] = [];
      while (i < flat.length && visible.has(i)) {
        blockLines.push({ ...flat[i], lineNo: i + 1 });
        i++;
      }
      const hasChange = blockLines.some((l) => l.type !== 'unchanged');
      blocks.push({ type: hasChange ? 'change' : 'context', lines: blockLines });
    }
  }

  return blocks;
}

export default function DiffViewer({ oldContent, newContent, oldLabel = 'Trước', newLabel = 'Sau' }: Props) {
  const changes = useMemo(() => diffLines(oldContent, newContent), [oldContent, newContent]);
  const blocks  = useMemo(() => buildBlocks(changes), [changes]);

  // Tính tóm tắt
  const added   = changes.filter((c) => c.added).reduce((s, c) => s + c.count!, 0);
  const removed = changes.filter((c) => c.removed).reduce((s, c) => s + c.count!, 0);
  const hasChanges = added > 0 || removed > 0;

  if (!hasChanges) {
    return (
      <div className="diff-viewer diff-viewer--no-change">
        <span>✓ Không có thay đổi giữa hai phiên bản</span>
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      {/* Summary */}
      <div className="diff-summary">
        <span className="diff-summary__label">So sánh:</span>
        <span className="diff-summary__old">{oldLabel}</span>
        <span className="diff-summary__arrow">→</span>
        <span className="diff-summary__new">{newLabel}</span>
        <div className="diff-summary__stats">
          {added > 0 && <span className="diff-stat diff-stat--added">+{added}</span>}
          {removed > 0 && <span className="diff-stat diff-stat--removed">-{removed}</span>}
        </div>
      </div>

      {/* Diff table */}
      <div className="diff-table">
        {blocks.map((block, bi) => {
          if (block.type === 'collapsed') {
            return (
              <div key={bi} className="diff-collapsed">
                <span>⋯ {block.collapsedCount} dòng không thay đổi</span>
              </div>
            );
          }

          return block.lines.map((line, li) => (
            <div
              key={`${bi}-${li}`}
              className={`diff-line diff-line--${line.type}`}
            >
              <span className="diff-line__gutter">
                {line.type === 'added'   ? '+' :
                 line.type === 'removed' ? '−' : ' '}
              </span>
              <span className="diff-line__no">{line.lineNo}</span>
              <code className="diff-line__text">{line.text || ' '}</code>
            </div>
          ));
        })}
      </div>
    </div>
  );
}
