import { Button } from "@/components/ui/button.tsx";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  /** Label for the items, e.g. "messages", "contacts" */
  itemLabel?: string;
};

export default function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  hasNextPage,
  hasPrevPage,
  goToPage,
  nextPage,
  prevPage,
  itemLabel = "items",
}: PaginationControlsProps) {
  if (totalItems <= 0) return null;

  // Build page numbers to show (max 5 visible)
  const pageNumbers = getVisiblePages(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        {startIndex}–{endIndex} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!hasPrevPage}
          onClick={() => goToPage(1)}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!hasPrevPage}
          onClick={prevPage}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((page) =>
          page === -1 ? (
            <span
              key={`ellipsis-${page}-${Math.random()}`}
              className="px-1 text-muted-foreground text-sm"
            >
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => goToPage(page)}
            >
              {page}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!hasNextPage}
          onClick={nextPage}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!hasNextPage}
          onClick={() => goToPage(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Returns an array of page numbers with -1 representing ellipsis */
function getVisiblePages(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, -1, total];
  }

  if (current >= total - 2) {
    return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, -1, current - 1, current, current + 1, -1, total];
}
