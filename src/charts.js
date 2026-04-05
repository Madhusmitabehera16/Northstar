function createSvg(width, height, inner) {
  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
      ${inner}
    </svg>
  `;
}

export function renderTrendChart(points) {
  if (!points.length) {
    return `<div class="empty-state"><p>No transactions available yet, so the balance trend is waiting for data.</p></div>`;
  }

  const width = 680;
  const height = 280;
  const padding = { top: 18, right: 20, bottom: 38, left: 20 };
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x = padding.left + (index / Math.max(points.length - 1, 1)) * (width - padding.left - padding.right);
    const y = padding.top + ((max - point.value) / range) * (height - padding.top - padding.bottom);
    return { ...point, x, y };
  });

  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coordinates.at(-1).x} ${height - padding.bottom} L ${coordinates[0].x} ${height - padding.bottom} Z`;

  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const y = padding.top + (index / 3) * (height - padding.top - padding.bottom);
    return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(20,48,74,0.1)" stroke-dasharray="4 8" />`;
  }).join("");

  const labels = coordinates
    .filter((_, index) => index === 0 || index === coordinates.length - 1 || index % 3 === 0)
    .map((point) => `<text x="${point.x}" y="${height - 12}" text-anchor="middle" fill="#587087" font-size="11">${point.label}</text>`)
    .join("");

  const dots = coordinates
    .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#0f766e" stroke="white" stroke-width="2" />`)
    .join("");

  return createSvg(
    width,
    height,
    `
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(15,118,110,0.32)" />
          <stop offset="100%" stop-color="rgba(15,118,110,0.02)" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#trendFill)"></path>
      <path d="${linePath}" fill="none" stroke="#0f766e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      ${dots}
      ${labels}
    `
  );
}

export function renderBarChart(items) {
  if (!items.length) {
    return `<div class="empty-state"><p>Add expense transactions to see a spending breakdown by category.</p></div>`;
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return items
    .map((item) => {
      const percent = total ? (item.amount / total) * 100 : 0;
      return `
        <div class="breakdown-item">
          <div class="breakdown-label-row">
            <span>${item.category}</span>
            <strong>${Math.round(percent)}%</strong>
          </div>
          <div class="breakdown-label-row">
            <span style="color:#587087;">$${item.amount.toLocaleString("en-US")}</span>
            <span style="color:#587087;">${total ? `${(item.amount / total).toFixed(2)} share` : "0 share"}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${percent}%; background:${item.color};"></div>
          </div>
        </div>
      `;
    })
    .join("");
}
