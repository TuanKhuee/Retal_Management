import { CccdCrypto } from './cccd-crypto';

describe('CccdCrypto', () => {
  const plainCccd = '001200001234';

  it('should encrypt and successfully decrypt CCCD', () => {
    const encrypted = CccdCrypto.encrypt(plainCccd);

    expect(encrypted).not.toBe(plainCccd);
    expect(encrypted).toContain(':'); // Contains iv:authTag:ciphertext

    const decrypted = CccdCrypto.decrypt(encrypted);
    expect(decrypted).toBe(plainCccd);
  });

  it('should extract the last 4 digits accurately', () => {
    expect(CccdCrypto.extractLast4('001200001234')).toBe('1234');
    expect(CccdCrypto.extractLast4('034 198 009 888')).toBe('9888');
  });

  it('should mask CCCD showing only last 4 digits', () => {
    const masked = CccdCrypto.maskCccd(plainCccd);
    expect(masked).toBe('********1234');
    expect(masked.endsWith('1234')).toBe(true);
  });

  it('should throw error when decrypting tampered data', () => {
    const encrypted = CccdCrypto.encrypt(plainCccd);
    const parts = encrypted.split(':');
    // Tamper with ciphertext
    const tampered = `${parts[0]}:${parts[1]}:badciphertext`;

    expect(() => {
      CccdCrypto.decrypt(tampered);
    }).toThrow();
  });
});
