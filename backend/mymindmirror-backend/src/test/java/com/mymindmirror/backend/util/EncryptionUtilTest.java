package com.mymindmirror.backend.util;

import org.junit.jupiter.api.Test;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class EncryptionUtilTest {

    private static final String USER_SECRET = "someLongPasswordHashThatIsAtLeast16BytesLongForSalt";
    private static final String PLAIN_TEXT = "Hello, this is a secret message!";

    @Test
    void encrypt_shouldReturnNonNullForValidInput() {
        String encrypted = EncryptionUtil.encrypt(PLAIN_TEXT, USER_SECRET);
        assertThat(encrypted).isNotNull();
        assertThat(encrypted).isNotBlank();
    }

    @Test
    void encrypt_withNullPlaintext_shouldEncryptEmptyString() {
        String encrypted = EncryptionUtil.encrypt(null, USER_SECRET);
        assertThat(encrypted).isNotNull();
        String decrypted = EncryptionUtil.decrypt(encrypted, USER_SECRET);
        assertThat(decrypted).isEmpty();
    }

    @Test
    void encrypt_withEmptyPlaintext_shouldEncryptToNonEmpty() {
        String encrypted = EncryptionUtil.encrypt("", USER_SECRET);
        assertThat(encrypted).isNotNull();
        String decrypted = EncryptionUtil.decrypt(encrypted, USER_SECRET);
        assertThat(decrypted).isEmpty();
    }

    @Test
    void encrypt_withNullUserSecret_shouldReturnNull() {
        String encrypted = EncryptionUtil.encrypt(PLAIN_TEXT, null);
        assertThat(encrypted).isNull();
    }

    @Test
    void encrypt_withEmptyUserSecret_shouldReturnNull() {
        String encrypted = EncryptionUtil.encrypt(PLAIN_TEXT, "");
        assertThat(encrypted).isNull();
    }

    @Test
    void decrypt_shouldReturnOriginalPlaintext() {
        String encrypted = EncryptionUtil.encrypt(PLAIN_TEXT, USER_SECRET);
        String decrypted = EncryptionUtil.decrypt(encrypted, USER_SECRET);
        assertThat(decrypted).isEqualTo(PLAIN_TEXT);
    }

    @Test
    void decrypt_withNullCiphertext_shouldReturnNull() {
        String result = EncryptionUtil.decrypt(null, USER_SECRET);
        assertThat(result).isNull();
    }

    @Test
    void decrypt_withEmptyCiphertext_shouldReturnEmpty() {
        String result = EncryptionUtil.decrypt("", USER_SECRET);
        assertThat(result).isEmpty();
    }

    @Test
    void decrypt_withNullUserSecret_shouldReturnOriginalCiphertext() {
        String encrypted = EncryptionUtil.encrypt(PLAIN_TEXT, USER_SECRET);
        String result = EncryptionUtil.decrypt(encrypted, null);
        assertThat(result).isEqualTo(encrypted);
    }

    @Test
    void decrypt_withEmptyUserSecret_shouldReturnOriginalCiphertext() {
        String encrypted = EncryptionUtil.encrypt(PLAIN_TEXT, USER_SECRET);
        String result = EncryptionUtil.decrypt(encrypted, "");
        assertThat(result).isEqualTo(encrypted);
    }

    @Test
    void decrypt_withInvalidBase64_shouldReturnOriginalString() {
        String invalidBase64 = "This is not valid base64!";
        String result = EncryptionUtil.decrypt(invalidBase64, USER_SECRET);
        assertThat(result).isEqualTo(invalidBase64);
    }

    @Test
    void decrypt_withTooShortData_shouldReturnOriginal() {
        String shortData = Base64.getEncoder().encodeToString(new byte[10]);
        String result = EncryptionUtil.decrypt(shortData, USER_SECRET);
        assertThat(result).isEqualTo(shortData);
    }

    @Test
    void decrypt_withWrongUserSecret_shouldReturnOriginalCiphertext() {
        String encrypted = EncryptionUtil.encrypt(PLAIN_TEXT, USER_SECRET);
        String wrongSecret = "differentPasswordHash";
        String result = EncryptionUtil.decrypt(encrypted, wrongSecret);
        // Decryption with wrong key causes BadPaddingException -> returns original ciphertext
        assertThat(result).isEqualTo(encrypted);
    }

    @Test
    void encryptAndDecrypt_shouldWorkWithLongText() {
        String longText = "A".repeat(10000);
        String encrypted = EncryptionUtil.encrypt(longText, USER_SECRET);
        String decrypted = EncryptionUtil.decrypt(encrypted, USER_SECRET);
        assertThat(decrypted).isEqualTo(longText);
    }

    @Test
    void encryptAndDecrypt_shouldWorkWithUnicodeCharacters() {
        String unicodeText = "Hello 世界! 🎉";
        String encrypted = EncryptionUtil.encrypt(unicodeText, USER_SECRET);
        String decrypted = EncryptionUtil.decrypt(encrypted, USER_SECRET);
        assertThat(decrypted).isEqualTo(unicodeText);
    }

    @Test
    void encrypt_shouldProduceDifferentOutputForSameInput() {
        String encrypted1 = EncryptionUtil.encrypt(PLAIN_TEXT, USER_SECRET);
        String encrypted2 = EncryptionUtil.encrypt(PLAIN_TEXT, USER_SECRET);
        assertThat(encrypted1).isNotEqualTo(encrypted2);
    }
}