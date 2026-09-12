import { IsIn } from 'class-validator';

// Dung chung cho "move category"/"move entry" (mui ten len/xuong, thay the
// drag-and-drop tree cho MVP - xem comment SeriesTreeEditor ben frontend).
export class MoveItemDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
