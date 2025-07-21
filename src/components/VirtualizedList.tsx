import { memo } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps {
  items: any[];
  itemSize: number;
  height: number;
  width: number;
  renderItem: ({ index, style }: { index: number; style: any }) => JSX.Element;
}

export const VirtualizedList = memo(function VirtualizedList({
  items,
  itemSize,
  height,
  width,
  renderItem
}: VirtualizedListProps) {
  return (
    <List
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={itemSize}
      itemData={items}
    >
      {renderItem}
    </List>
  );
});