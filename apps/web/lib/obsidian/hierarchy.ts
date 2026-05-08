import { config } from "../config";
import { mkdir } from "fs/promises";
import path from "path";

/**
 * Creates the year/month/week folder structure and returns the directory path.
 * Structure: {personaModelPath}/YYYY/MM-MMM/WNN/ where MM-MMM is like "05-May" and WNN is ISO week like "W19".
 */
export async function ensureHierarchy(date: Date): Promise<string> {
  const yearPath = getYearPath(date);
  const monthLabel = getMonthLabel(date);
  const weekIndex = getWeekIndex(date);
  
  const fullPath = path.join(yearPath, monthLabel, weekIndex);
  
  await mkdir(fullPath, { recursive: true });
  
  return fullPath;
}

/**
 * Returns full path to the daily note: {personaModelPath}/YYYY/MM-MMM/WNN/YYYY-MM-DD.md
 */
export function getNotePath(date: Date): string {
  const yearPath = getYearPath(date);
  const monthLabel = getMonthLabel(date);
  const weekIndex = getWeekIndex(date);
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  return path.join(yearPath, monthLabel, weekIndex, `${dateString}.md`);
}

/**
 * Returns ISO week string like "W19"
 */
export function getWeekIndex(date: Date): string {
  // Get ISO week number
  const weekNum = getISOWeekNumber(date);
  return `W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Returns "05-May" style month label
 */
export function getMonthLabel(date: Date): string {
  const month = date.getMonth() + 1; // Months are 0-indexed
  const monthName = date.toLocaleString('en-US', { month: 'short' });
  return `${month.toString().padStart(2, '0')}-${monthName}`;
}

/**
 * Returns {personaModelPath}/YYYY/
 */
export function getYearPath(date: Date): string {
  const year = date.getFullYear();
  return path.join(config.personaModelPath, year.toString());
}

/**
 * Returns {personaModelPath}/YYYY/MM-MMM/WNN/
 */
export function getWeekPath(date: Date): string {
  const yearPath = getYearPath(date);
  const monthLabel = getMonthLabel(date);
  const weekIndex = getWeekIndex(date);
  
  return path.join(yearPath, monthLabel, weekIndex);
}

/**
 * Helper function to get ISO week number
 * Adapted from: https://stackoverflow.com/a/6117889
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday is 0, we want 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}