/**
 * Formatting Utilities as required by CLAUDE.md Rule 4
 * Money: integer VND displayed as '3.935.000 ₫'
 * Date: 'dd/MM/yyyy'
 */

export function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0 ₫';
  }
  const numeric = Math.round(Number(amount));
  return `${numeric.toLocaleString('vi-VN')} ₫`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '--/--/----';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--/--/----';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '--/--/---- --:--';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--/--/---- --:--';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}
