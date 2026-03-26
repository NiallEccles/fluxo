import { ArrowRightFromLine, GripVertical } from 'lucide-react';

interface ResizeHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onDoubleClick: () => void
  isDragging: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function ResizeHandle({
  onPointerDown,
  onDoubleClick,
  isDragging,
  isCollapsed,
  onToggleCollapse,
}: ResizeHandleProps) {
  return (
    <div className="relative shrink-0 flex items-center justify-center self-stretch w-5">
      {/* Draggable strip — hidden when collapsed */}
      {!isCollapsed && (
        <div
          onPointerDown={onPointerDown}
          onDoubleClick={onDoubleClick}
          className={`absolute inset-0 cursor-col-resize transition-colors flex flex-col items-center justify-center ${
            isDragging ? 'bg-indigo-500/20' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
            <GripVertical className="w-5 h-5" />
          </div>
      )}

      {/* Collapse / expand toggle */}
      {/* <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleCollapse()
        }}
        aria-label={isCollapsed ? 'Expand editor panel' : 'Collapse editor panel'}
        aria-expanded={!isCollapsed}
        className="relative z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full text-gray-300 transition-colors shadow text-[10px] leading-none select-none"
      >
        {isCollapsed ? <ArrowRightFromLine /> : <GripVertical />}
      </button> */}
    </div>
  )
}
