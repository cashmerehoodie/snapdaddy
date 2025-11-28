import { format as dateFnsFormat } from "date-fns";

export type DateFormatPreference = "DD/MM/YYYY" | "MM/DD/YYYY";

/**
 * Get user's date format preference from localStorage
 */
export const getDateFormatPreference = (): DateFormatPreference => {
  const stored = localStorage.getItem("dateFormat");
  return (stored as DateFormatPreference) || "DD/MM/YYYY";
};

/**
 * Format a date according to user's preference
 */
export const formatDate = (
  date: Date | string | number,
  formatType: "short" | "medium" | "long" = "short"
): string => {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const preference = getDateFormatPreference();

  if (formatType === "short") {
    // Short format: DD/MM/YY or MM/DD/YY
    return preference === "DD/MM/YYYY"
      ? dateFnsFormat(dateObj, "dd/MM/yy")
      : dateFnsFormat(dateObj, "MM/dd/yy");
  }

  if (formatType === "medium") {
    // Medium format: 28 Nov 2025 or Nov 28, 2025
    return preference === "DD/MM/YYYY"
      ? dateFnsFormat(dateObj, "dd MMM yyyy")
      : dateFnsFormat(dateObj, "MMM dd, yyyy");
  }

  if (formatType === "long") {
    // Long format: 28 November 2025 or November 28, 2025
    return preference === "DD/MM/YYYY"
      ? dateFnsFormat(dateObj, "dd MMMM yyyy")
      : dateFnsFormat(dateObj, "MMMM dd, yyyy");
  }

  return dateFnsFormat(dateObj, "dd/MM/yy");
};

/**
 * Format a date for month grouping (always month name + year)
 */
export const formatMonthYear = (date: Date | string | number): string => {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return dateFnsFormat(dateObj, "MMM yyyy");
};
