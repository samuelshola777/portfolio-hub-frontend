"use client";

import type { PageData } from "@/lib/business";

function pageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const values: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];
  if (current > 4) values.push("ellipsis-left");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) values.push(page);
  if (current < total - 3) values.push("ellipsis-right");
  values.push(total);
  return values;
}

export function Pagination<T>({
  page,
  onPage,
}: {
  page: PageData<T>;
  onPage: (value: number) => void;
}) {
  if (page.totalPages <= 1 && page.totalItems === 0) return null;
  const firstItem = page.totalItems === 0 ? 0 : (page.currentPage - 1) * page.pageSize + 1;
  const lastItem = Math.min(page.totalItems, page.currentPage * page.pageSize);

  return (
    <nav className="pagination pagination-v2" aria-label="Pagination">
      <p>
        <strong>
          {firstItem}–{lastItem}
        </strong>{" "}
        of <strong>{page.totalItems}</strong>
      </p>
      <div>
        <button
          type="button"
          className="pagination-arrow"
          disabled={!page.hasPrevious}
          onClick={() => onPage(page.currentPage - 1)}
          aria-label="Previous page"
        >
          ←
        </button>
        {pageNumbers(page.currentPage, Math.max(1, page.totalPages)).map((value) =>
          typeof value === "number" ? (
            <button
              type="button"
              key={value}
              className={value === page.currentPage ? "is-current" : ""}
              aria-current={value === page.currentPage ? "page" : undefined}
              onClick={() => onPage(value)}
            >
              {value}
            </button>
          ) : (
            <span key={value} aria-hidden="true">
              …
            </span>
          ),
        )}
        <button
          type="button"
          className="pagination-arrow"
          disabled={!page.hasNext}
          onClick={() => onPage(page.currentPage + 1)}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </nav>
  );
}
