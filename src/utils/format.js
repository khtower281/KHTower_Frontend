// Format number as PKR
export const formatPKR = (amount) => {
  const num = Number(amount) || 0;
  return `Rs ${num.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

// Compact version for cards: Rs 1.2M, Rs 45K, etc.
export const formatPKRCompact = (amount) => {
  const num = Number(amount) || 0;
  if (Math.abs(num) >= 1_000_000) return `Rs ${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `Rs ${(num / 1_000).toFixed(1)}K`;
  return `Rs ${num.toLocaleString("en-PK")}`;
};

// Format date in Pakistan timezone: "10 Jan 2026"
export const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
};

// For <input type="date"> — outputs YYYY-MM-DD in Pakistan time
export const toDateInputValue = (date) => {
  if (!date) return "";
  const d = new Date(date);
  // Use Pakistan timezone to derive the correct Y-M-D
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

// Get today's date in Pakistan as YYYY-MM-DD
export const todayInPakistan = () => toDateInputValue(new Date());