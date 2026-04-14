# Google Apps Script — Orders Webhook + Menu price sync

Paste into: **Google Sheet → Extensions → Apps Script**  
Then: **Deploy → New deployment → Web app**  
**Execute as:** Me · **Who has access:** Anyone  

Copy the Web App URL into `GOOGLE_SHEETS_WEBHOOK_URL` in `.env.local`.

**Private sales trajectory:** After each new order, the script updates a **Monthly sales** tab (one row per calendar month: order count, revenue, avg order) and refreshes an embedded **line chart** (revenue over time). Only people you share the spreadsheet with can see it—keep the sheet private and treat the webhook URL like a password.

**One-time backfill:** If you already have rows on **Orders** before this feature, open Apps Script and run **`rebuildMonthlySalesFromOrders`** once (select it in the toolbar, click Run). Authorize if prompted. That rebuilds **Monthly sales** from your **Orders** sheet (uses **Total ($)** on the first line of each order, column **R**).

**Upgrading:** If your workbook still has an older **Orders** tab (fewer columns), rename or delete it so this script can create the **26-column** header row (adds **Sauce Cups** after **Est. Profit**). Keep a backup of old data if needed.

After changing this script, use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**.

**Totals note:** `Total Cost` uses `SUMPRODUCT` of **Qty × Unit Cost** (columns H×K). The spec’s `SUMIF`/`L` variant would have summed the **Est. Profit** column by mistake.

```javascript
// ============================================================
// MR. K'S FILIPINO KITCHEN — GOOGLE APPS SCRIPT
// Paste this into: Google Sheet → Extensions → Apps Script
// Then: Deploy → New Deployment → Web App
// Execute as: Me | Who has access: Anyone
// Copy the Web App URL into your .env.local
// ============================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === "menuPrices") {
      handleMenuPrices_(ss, data);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, menuPrices: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Update existing rows by Order # (one row per line item — update every match)
    if (data.type === "status_update") {
      var sheetUp = ss.getSheetByName("Orders");
      if (!sheetUp) {
        return ContentService
          .createTextOutput(JSON.stringify({ success: false, error: "No Orders sheet" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var values = sheetUp.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] === data.orderNumber) {
          sheetUp.getRange(i + 1, 24).setValue(data.orderStatus || "");
          sheetUp.getRange(i + 1, 25).setValue(data.paymentMethod || "");
          sheetUp.getRange(i + 1, 26).setValue(data.paymentStatus || "");
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, updated: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName("Orders");
    if (!sheet) {
      sheet = ss.insertSheet("Orders");
      sheet.appendRow([
        "Order #", "Date", "Customer Name", "Phone", "Email",
        "Item Name", "Size/Variant", "Qty", "Unit Price ($)", "Line Total ($)",
        "Unit Cost ($)", "Est. Profit ($)", "Sauce Cups",
        "Utensil Sets", "Utensil Charge ($)",
        "Subtotal ($)", "Tax ($)", "Total ($)",
        "Pickup Date", "Pickup Time", "Recurring?",
        "Notes", "Custom Inquiry", "Status", "Payment Method", "Payment Status"
      ]);
      sheet.getRange(1, 1, 1, 26)
        .setFontWeight("bold")
        .setBackground("#0038A8")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    var payMethod =
      data.paymentMethod != null ? data.paymentMethod : "Zelle or Venmo (unverified)";
    var payStatus = data.paymentStatus != null ? data.paymentStatus : "Pending";
    var ordStatus = data.orderStatus != null ? data.orderStatus : (data.status || "");

    var items = data.items || [];

    if (items.length === 0) {
      sheet.appendRow([
        data.orderNumber,
        new Date(data.date).toLocaleString(),
        data.customerName,
        data.phone,
        data.email,
        data.itemsSummary,
        "", "", "", "", "", "", "",
        data.utensilSets,
        parseFloat(data.utensilCharge),
        parseFloat(data.subtotal),
        parseFloat(data.tax),
        parseFloat(data.total),
        data.pickupDate,
        data.pickupTime,
        data.wantsRecurring,
        data.notes,
        data.customInquiry,
        ordStatus,
        payMethod,
        payStatus
      ]);
    } else {
      items.forEach(function (item, index) {
        var lineTotal = item.lineTotal != null
          ? parseFloat(item.lineTotal)
          : item.quantity * parseFloat(item.unitPrice);
        var unitCost = item.unitCost != null ? parseFloat(item.unitCost) : "";
        var estProfit = item.estimatedProfit != null ? parseFloat(item.estimatedProfit) : "";
        var sauceCups = item.sauceCups != null ? item.sauceCups : "";
        sheet.appendRow([
          data.orderNumber,
          new Date(data.date).toLocaleString(),
          data.customerName,
          data.phone,
          data.email,
          item.name,
          item.size || "",
          item.quantity,
          parseFloat(item.unitPrice),
          lineTotal,
          unitCost,
          estProfit,
          sauceCups,
          index === 0 ? data.utensilSets : "",
          index === 0 ? parseFloat(data.utensilCharge) : "",
          index === 0 ? parseFloat(data.subtotal) : "",
          index === 0 ? parseFloat(data.tax) : "",
          index === 0 ? parseFloat(data.total) : "",
          index === 0 ? data.pickupDate : "",
          index === 0 ? data.pickupTime : "",
          index === 0 ? data.wantsRecurring : "",
          index === 0 ? data.notes : "",
          index === 0 ? data.customInquiry : "",
          index === 0 ? ordStatus : "",
          index === 0 ? payMethod : "",
          index === 0 ? payStatus : ""
        ]);
      });
    }

    // Per-order monthly totals + line chart (uses ISO date + order total from webhook)
    bumpMonthlySalesFromOrder_(ss, data.date, data.total);

    var totals = ss.getSheetByName("Totals");
    if (!totals) {
      totals = ss.insertSheet("Totals");
      totals.appendRow(["Metric", "Value"]);
      totals.appendRow(["Total Orders", "=COUNTA(Orders!A2:A)"]);
      totals.appendRow(["Total Revenue ($)", "=SUMIF(Orders!F2:F,\"<>\",Orders!J2:J)"]);
      totals.appendRow(["Total Cost ($)", "=SUMPRODUCT((Orders!F2:F<>\"\")*(Orders!H2:H)*(Orders!K2:K))"]);
      totals.appendRow(["Total Profit ($)", "=SUMIF(Orders!F2:F,\"<>\",Orders!L2:L)"]);
      totals.appendRow(["Avg Order Value ($)", "=IFERROR(Totals!B3/Totals!B2,0)"]);
      totals.appendRow(["Avg Profit per Order ($)", "=IFERROR(Totals!B5/Totals!B2,0)"]);
      totals.appendRow(["Total Utensil Revenue ($)", "=SUM(Orders!O2:O)"]);
      totals.getRange(1, 1, 1, 2).setFontWeight("bold")
        .setBackground("#FFC200").setFontColor("#1A1A1A");
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** Full refresh of retail unit prices (one row per menu size line). */
function handleMenuPrices_(ss, data) {
  var mp = ss.getSheetByName("Menu prices");
  if (!mp) {
    mp = ss.insertSheet("Menu prices");
  }
  mp.clear();
  var header = [["Synced at (ISO)", "Menu item ID", "Item name", "Size / variant", "Unit price ($)"]];
  mp.getRange(1, 1, 1, 5).setValues(header);
  mp.getRange(1, 1, 1, 5).setFontWeight("bold")
    .setBackground("#0D7B5C").setFontColor("#FFFFFF");
  mp.setFrozenRows(1);
  var syncedAt = data.syncedAt || new Date().toISOString();
  var rows = data.rows || [];
  var body = rows.map(function (r) {
    return [syncedAt, r.menuItemId, r.name, r.sizeLabel, r.unitPrice];
  });
  if (body.length > 0) {
    mp.getRange(2, 1, body.length + 1, 5).setValues(body);
  }
  for (var c = 1; c <= 5; c++) {
    mp.autoResizeColumn(c);
  }
}

/** Ensures tab exists with header row. */
function ensureMonthlySalesSheet_(ss) {
  var sh = ss.getSheetByName("Monthly sales");
  if (!sh) {
    sh = ss.insertSheet("Monthly sales");
  }
  var h = sh.getRange(1, 1).getValue();
  if (h !== "Month (YYYY-MM)") {
    sh.clear();
    sh.appendRow(["Month (YYYY-MM)", "Orders (#)", "Revenue ($)", "Avg order ($)"]);
    sh.getRange(1, 1, 1, 4)
      .setFontWeight("bold")
      .setBackground("#6B2D5C")
      .setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
  }
  return sh;
}

/** yyyy-MM in spreadsheet timezone */
function monthKeyFromIso_(ss, isoDateStr) {
  var d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return null;
  var tz = ss.getSpreadsheetTimeZone() || "America/Chicago";
  return Utilities.formatDate(d, tz, "yyyy-MM");
}

function round2_(n) {
  return Math.round(parseFloat(n) * 100) / 100;
}

/**
 * Call after each new order. Counts one order; adds order total (incl. tax) to that month.
 */
function bumpMonthlySalesFromOrder_(ss, isoDateStr, totalStr) {
  var month = monthKeyFromIso_(ss, isoDateStr);
  if (!month) return;
  var add = round2_(totalStr);
  if (isNaN(add)) return;

  var sh = ensureMonthlySalesSheet_(ss);
  var data = sh.getDataRange().getValues();
  var row1Based = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === month) {
      row1Based = r + 1;
      break;
    }
  }

  if (row1Based < 0) {
    sh.appendRow([month, 1, add, add]);
  } else {
    var orders = parseInt(sh.getRange(row1Based, 2).getValue(), 10) || 0;
    var rev = round2_(sh.getRange(row1Based, 3).getValue()) || 0;
    orders += 1;
    rev = round2_(rev + add);
    var avg = orders > 0 ? round2_(rev / orders) : 0;
    sh.getRange(row1Based, 2).setValue(orders);
    sh.getRange(row1Based, 3).setValue(rev);
    sh.getRange(row1Based, 4).setValue(avg);
  }

  sortMonthlySalesSheet_(sh);
  ensureMonthlyTrajectoryChart_(ss);
}

function sortMonthlySalesSheet_(sh) {
  var lr = sh.getLastRow();
  if (lr < 3) return;
  sh.getRange(2, 1, lr, 4).sort({ column: 1, ascending: true });
}

/** Line chart: Month vs Orders + Revenue (first column = domain). */
function ensureMonthlyTrajectoryChart_(ss) {
  var sh = ss.getSheetByName("Monthly sales");
  if (!sh) return;
  var charts = sh.getCharts();
  for (var c = 0; c < charts.length; c++) {
    sh.removeChart(charts[c]);
  }
  var lr = sh.getLastRow();
  if (lr < 2) return;

  var chart = sh.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sh.getRange(1, 1, lr, 3))
    .setOption("useFirstColumnAsDomain", true)
    .setOption("title", "Monthly sales (orders & revenue)")
    .setOption("legendPosition", "bottom")
    .setOption("hAxis", { title: "Month" })
    .setOption("series", {
      0: { targetAxisIndex: 1, lineWidth: 2 },
      1: { targetAxisIndex: 0, lineWidth: 3 }
    })
    .setOption("vAxes", {
      0: { title: "Revenue ($)" },
      1: { title: "Orders (#)" }
    })
    .setPosition(2, 6, 0, 0)
    .build();
  sh.insertChart(chart);
}

/**
 * Run once from Apps Script editor after upgrading: rebuilds Monthly sales from Orders.
 * Uses column R (Total $) on rows where it is set (first line of each order).
 */
function rebuildMonthlySalesFromOrders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  rebuildMonthlySalesFromOrders_(ss);
}

function rebuildMonthlySalesFromOrders_(ss) {
  var ord = ss.getSheetByName("Orders");
  var sh = ensureMonthlySalesSheet_(ss);
  if (!ord) return;

  var values = ord.getDataRange().getValues();
  var tz = ss.getSpreadsheetTimeZone() || "America/Chicago";
  var agg = {};

  for (var i = 1; i < values.length; i++) {
    var totalCell = values[i][17];
    if (totalCell === "" || totalCell == null) continue;
    var numTotal = round2_(totalCell);
    if (isNaN(numTotal)) continue;

    var rawD = values[i][1];
    var d = rawD instanceof Date ? rawD : new Date(rawD);
    if (isNaN(d.getTime())) continue;

    var mk = Utilities.formatDate(d, tz, "yyyy-MM");
    if (!agg[mk]) agg[mk] = { count: 0, revenue: 0 };
    agg[mk].count += 1;
    agg[mk].revenue = round2_(agg[mk].revenue + numTotal);
  }

  var lr = sh.getLastRow();
  if (lr > 1) {
    sh.getRange(2, 1, lr, 4).clearContent();
  }

  var months = Object.keys(agg).sort();
  if (months.length === 0) {
    ensureMonthlyTrajectoryChart_(ss);
    return;
  }

  var rows = months.map(function (m) {
    var x = agg[m];
    var avg = x.count > 0 ? round2_(x.revenue / x.count) : 0;
    return [m, x.count, x.revenue, avg];
  });
  sh.getRange(2, 1, rows.length + 1, 4).setValues(rows);
  ensureMonthlyTrajectoryChart_(ss);
}

function doGet(e) {
  return ContentService
    .createTextOutput("Mr. K's webhook is active ✓")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## Monthly sales tab

- **Updates automatically** whenever the site POSTs a new order to your web app (same webhook as **Orders**). No cron job required: each order bumps that month’s **Orders (#)** and **Revenue ($)** (order total including tax, one count per order).
- **Chart:** A **line chart** on the **Monthly sales** tab shows **Orders** and **Revenue** by month (domain = first column). The script removes and recreates the chart after each update so the series includes new months.
- **Timezone:** Months use your spreadsheet’s **File → Settings → Time zone** (fallback America/Chicago).
- **History:** If you already had orders before pasting this script, run **`rebuildMonthlySalesFromOrders`** once in the Apps Script editor (toolbar function dropdown → Run) to backfill from **Orders** column **R** (Total).

## Menu prices tab

When you save menu changes in **Admin → Menu Manager**, the app POSTs with `type: "menuPrices"` and refreshes the **Menu prices** sheet.

Manual push (admin session): `POST /api/admin/sheets/sync-menu`

## Order line payload (`items[]`)

Each element includes `name`, `size`, `quantity`, `unitPrice`, `lineTotal`, **`unitCost`**, **`estimatedProfit`**, **`sauceCups`**, and for flan optionally `container`, `dipCup`, `foilCover`, `frozenBag`.

New orders POST with `type: "order"` (or legacy without `type`) also send **`pickupDate`**, **`pickupTime`**, **`paymentMethod`**, **`paymentStatus`**, and **`orderStatus`** (mirrors DB status).

**Status sync:** When an admin verifies payment or marks it not received, the app POSTs:

`{ "type": "status_update", "orderNumber": "MRK-…", "orderStatus": "…", "paymentMethod": "…", "paymentStatus": "…" }`

The script updates **column 24 (Status)**, **25 (Payment Method)**, and **26 (Payment Status)** on **every** row whose **Order #** (column A) matches — no new rows appended.
