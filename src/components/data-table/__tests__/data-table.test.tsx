import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";

type Row = { id: string; session: string; price: number };

const ROWS: Row[] = [
  { id: "b1", session: "Wed, 22 Oct 2026, 16:47 to 17:47", price: 900 },
  { id: "b2", session: "Thu, 23 Oct 2026, 07:00 to 08:00", price: 600 },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { id: "session", header: "Session", className: "min-w-40 whitespace-normal", cell: (row) => row.session },
  { id: "price", header: "Price", className: "tabular-nums", cell: (row) => `INR ${row.price}` },
];

// jsdom does no layout, so the scroller's widths come from here.
const size = { scrollWidth: 1266, clientWidth: 1094 };

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute("data-table-scroll") ? size.scrollWidth : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute("data-table-scroll") ? size.clientWidth : 0;
    },
  });
});
afterAll(() => {
  // Back to jsdom's own getters, which live on Element.prototype.
  delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});
beforeEach(() => {
  size.scrollWidth = 1266;
  size.clientWidth = 1094;
});
afterEach(cleanup);

function renderTable() {
  return render(
    <DataTable
      rows={ROWS}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      caption="Bookings"
      countLabel={(count) => `${count} bookings`}
      empty={<p>None</p>}
    />,
  );
}

function scroller(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>("[data-table-scroll]");
  if (!element) throw new Error("No scroll container.");
  return element;
}

describe("DataTable horizontal scroll", () => {
  it("scrolls sideways with a styled scrollbar", () => {
    const { container } = renderTable();
    const element = scroller(container);
    expect(element.className).toContain("overflow-auto");
    expect(element.className).toContain("[scrollbar-width:thin]");
    expect(element.className).toContain("hover:[scrollbar-color:");
  });

  it("shows a right-edge fade while columns are hidden and drops it at the end", () => {
    const { container } = renderTable();
    expect(container.querySelector("[data-scroll-fade]")).not.toBeNull();
    expect(container.querySelector("[data-scroll-fade]")?.getAttribute("aria-hidden")).toBe("true");

    const element = scroller(container);
    Object.defineProperty(element, "scrollLeft", { configurable: true, value: 172 });
    act(() => {
      fireEvent.scroll(element);
    });
    expect(container.querySelector("[data-scroll-fade]")).toBeNull();
  });

  it("shows no fade when the table fits", () => {
    size.scrollWidth = 900;
    size.clientWidth = 1094;
    const { container } = renderTable();
    expect(container.querySelector("[data-scroll-fade]")).toBeNull();
  });

  it("lets a column with a minimum wrap instead of forcing the table wider", () => {
    renderTable();
    const header = screen.getByRole("columnheader", { name: "Session" });
    expect(header.className).toContain("min-w-40");
    expect(header.className).toContain("whitespace-normal");
    expect(header.className).not.toContain("whitespace-nowrap");
    const cell = screen.getByText("Wed, 22 Oct 2026, 16:47 to 17:47");
    expect(cell.className).toContain("whitespace-normal");
    expect(cell.className).not.toContain("whitespace-nowrap");
  });
});
