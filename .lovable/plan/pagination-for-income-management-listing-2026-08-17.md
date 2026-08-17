# Pagination for Income Management listing

Add page-by-page browsing to the income records table so long lists load in readable chunks instead of one long scroll.

## What changes

- Add the existing pagination bar (already used in Audit Logs, Members, User Management) below the income table.
- Default 25 rows per page, with a per-page selector (10 / 25 / 50 / 100).
- Shows "Showing X–Y of Z income records" plus first/prev/page-number/next/last controls.
- Page resets to 1 whenever the search text or the category / payment-method filters change, or after adding, editing or deleting a record.
- The Total Income card keeps showing the total of all filtered records, not just the current page.

## Technical notes

Edit only `src/pages/admin/tabs/IncomeTab.tsx`:

- Import `TablePagination` from `@/components/admin/TablePagination`.
- Add `currentPage` and `itemsPerPage` state (default 25).
- Derive `totalPages`, `startIndex`, `endIndex` and a `paginatedIncomes` memo slicing `filteredIncomes`; render `paginatedIncomes` in the table body.
- `useEffect` on `[searchValue, filterValues]` to reset `currentPage` to 1; also clamp page when `totalPages` shrinks.
- Place `<TablePagination />` after `</Table>` inside the existing `CardContent`, with `itemLabel="income records"`.

No backend or query changes — pagination is client-side over the already-fetched records.
