// src/main/java/com/mymindmirror/backend/util/EncryptionUtil.java
package com.mymindmirror.backend.util;

import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.BadPaddingException;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;
import java.util.logging.Level;
import java.util.logging.Logger;

public class EncryptionUtil {

    private static final Logger logger = Logger.getLogger(EncryptionUtil.class.getName());
    // Explicitly define algorithm with mode and padding for consistency
    private static final String ALGORITHM = "AES/ECB/PKCS5Padding";

    /**
     * Generates an AES key from a given secret string.
     * Uses SHA-1 hash and truncates to 16 bytes for AES-128.
     * @param secret The secret string (e.g., user's password hash).
     * @return A SecretKeySpec for AES.
     * @throws Exception if key generation fails.
     */
    private static SecretKeySpec generateKey(String secret) throws Exception {
        byte[] key;
        MessageDigest sha = MessageDigest.getInstance("SHA-1");
        key = sha.digest(secret.getBytes(StandardCharsets.UTF_8));
        key = Arrays.copyOf(key, 16); // AES-128 requires 16 bytes key
        return new SecretKeySpec(key, "AES"); // Algorithm name for SecretKeySpec is "AES"
    }

    /**
     * Encrypts a string using AES.
     * @param strToEncrypt The string to be encrypted.
     * @param secret The secret string used to generate the encryption key.
     * @return The Base64 encoded encrypted string, or null if encryption fails.
     */
    public static String encrypt(String strToEncrypt, String secret) {
        // If string is null or empty, no need to encrypt, return as is.
        if (strToEncrypt == null || strToEncrypt.isEmpty()) {
            return strToEncrypt;
        }
        try {
            SecretKeySpec secretKey = generateKey(secret);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            byte[] encryptedBytes = cipher.doFinal(strToEncrypt.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Error while encrypting: " + e.toString(), e);
        }
        return null; // Return null if encryption fails
    }

    /**
     * Decrypts a Base64 encoded string using AES.
     * @param strToDecrypt The Base64 encoded string to be decrypted.
     * @param secret The secret string used to generate the decryption key.
     * @return The decrypted string. If decryption fails (e.g., invalid format, wrong key),
     * the original string is returned to prevent data loss and allow display.
     */
    public static String decrypt(String strToDecrypt, String secret) {
        // If string is null or empty, no need to decrypt, return as is.
        if (strToDecrypt == null || strToDecrypt.isEmpty()) {
            return strToDecrypt;
        }
        try {
            SecretKeySpec secretKey = generateKey(secret);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey);
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(strToDecrypt));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            // This catches "Illegal base64 character" errors.
            // Occurs when trying to decode a string that is not valid Base64 (e.g., old plain text entries).
            logger.log(Level.WARNING, "IllegalArgumentException (invalid Base64) during decryption. Returning original string. Error: " + e.getMessage());
            return strToDecrypt;
        } catch (BadPaddingException e) {
            // This catches errors related to incorrect padding.
            // Occurs when the data is not correctly padded, often indicating:
            // 1. The data was not encrypted with PKCS5Padding.
            // 2. The data is corrupted.
            // 3. The wrong key was used.
            logger.log(Level.WARNING, "BadPaddingException during decryption. Likely wrong key, corrupted data, or unencrypted data. Returning original string. Error: " + e.getMessage());
            return strToDecrypt;
        } catch (IllegalBlockSizeException e) {
            // This catches errors where the input data length is not a multiple of the cipher's block size.
            // Occurs when the Base64 decoded data is not a valid length for the cipher's block size,
            // often indicating unencrypted data or corrupted encrypted data.
            logger.log(Level.WARNING, "IllegalBlockSizeException during decryption. Likely unencrypted or corrupted data. Returning original string. Error: " + e.getMessage());
            return strToDecrypt;
        } catch (Exception e) {
            // Catch any other unexpected exceptions during the decryption process.
            logger.log(Level.SEVERE, "Generic error during decryption: " + e.toString(), e);
            return strToDecrypt; // Fallback: return original string if any other error occurs
        }
    }
}
