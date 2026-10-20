import { useMemo } from 'react';

export interface PasswordCriteria {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  hasUpper: boolean;
}

export interface PasswordStrengthResult {
  criteria: PasswordCriteria;
  score: number; // 0: empty, 1: weak, 2: medium, 3: strong
  label: string;
}

export function usePasswordStrength(password: string): PasswordStrengthResult {
  return useMemo(() => {
    if (!password) {
      return {
        criteria: {
          hasMinLength: false,
          hasNumber: false,
          hasSpecial: false,
          hasUpper: false,
        },
        score: 0,
        label: 'Tối thiểu 8 ký tự',
      };
    }

    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasUpper = /[A-Z]/.test(password);

    const criteria: PasswordCriteria = {
      hasMinLength,
      hasNumber,
      hasSpecial,
      hasUpper,
    };

    let metCount = 0;
    if (hasMinLength) metCount++;
    if (hasNumber) metCount++;
    if (hasSpecial) metCount++;
    if (hasUpper) metCount++;

    let score = 1;
    let label = 'Yếu';

    if (metCount >= 4) {
      score = 3;
      label = 'Rất mạnh';
    } else if (metCount >= 3) {
      score = 2;
      label = 'Khá mạnh';
    } else if (metCount >= 2) {
      score = 1;
      label = 'Trung bình';
    } else {
      score = 1;
      label = 'Yếu';
    }

    return {
      criteria,
      score,
      label,
    };
  }, [password]);
}
